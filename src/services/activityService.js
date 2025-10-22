const Activity = require('../models/activity');
const { paiseToRupees } = require('./expenseValidation');

/**
 * Activity Service
 * 
 * Handles creation of activities for various events in the system.
 * Activities are shown in the activity feed to keep users informed
 * about expenses, transactions, and other relevant events.
 */

/**
 * Create an activity when a new expense is created
 * 
 * @param {Object} expense - Expense document (populated with payer and participants)
 * @param {string} actorId - User who created the expense
 * @returns {Promise<Activity>}
 */
const createExpenseActivity = async (expense, actorId) => {
  try {
    // Extract all unique user IDs who should see this activity
    const targets = new Set();
    
    // Add payer
    const payerId = expense.payer._id ? expense.payer._id.toString() : expense.payer.toString();
    targets.add(payerId);
    
    // Add all participants
    expense.participants.forEach(p => {
      const userId = p.user._id ? p.user._id.toString() : p.user.toString();
      targets.add(userId);
    });
    
    // Create activity
    const activity = new Activity({
      type: 'EXPENSE_CREATED',
      actor: actorId,
      targets: Array.from(targets),
      payload: {
        expenseId: expense._id,
        title: `New expense: ${expense.title}`,
        description: `${expense.payer.name || 'Someone'} paid ₹${paiseToRupees(expense.amount)} for "${expense.title}"`,
        amount: expense.amount,
        metadata: {
          participantCount: expense.participants.length,
          splitMethod: expense.splitMethod
        }
      }
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating expense activity:', error);
    // Don't throw - activity creation should not break the main flow
    return null;
  }
};

/**
 * Create an activity when a transaction/settlement is made
 * 
 * @param {Object} transaction - Transaction document (populated with from and to users)
 * @param {string} actorId - User who created the transaction
 * @returns {Promise<Activity>}
 */
const createTransactionActivity = async (transaction, actorId) => {
  try {
    const fromId = transaction.from._id ? transaction.from._id.toString() : transaction.from.toString();
    const toId = transaction.to._id ? transaction.to._id.toString() : transaction.to.toString();
    
    // Both sender and receiver should see this activity
    const targets = [fromId, toId];
    
    const activity = new Activity({
      type: 'TRANSACTION_CREATED',
      actor: actorId,
      targets,
      payload: {
        transactionId: transaction._id,
        title: `Payment: ₹${paiseToRupees(transaction.amount)}`,
        description: `${transaction.from.name || 'Someone'} paid ₹${paiseToRupees(transaction.amount)} to ${transaction.to.name || 'someone'}${transaction.note ? ` - ${transaction.note}` : ''}`,
        amount: transaction.amount,
        metadata: {
          note: transaction.note
        }
      }
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating transaction activity:', error);
    return null;
  }
};

/**
 * Create an activity when an expense is updated
 * 
 * @param {Object} expense - Updated expense document
 * @param {string} actorId - User who updated the expense
 * @param {Object} changes - Object describing what changed
 * @returns {Promise<Activity>}
 */
const createExpenseUpdateActivity = async (expense, actorId, changes = {}) => {
  try {
    const targets = new Set();
    
    const payerId = expense.payer._id ? expense.payer._id.toString() : expense.payer.toString();
    targets.add(payerId);
    
    expense.participants.forEach(p => {
      const userId = p.user._id ? p.user._id.toString() : p.user.toString();
      targets.add(userId);
    });
    
    const activity = new Activity({
      type: 'EXPENSE_UPDATED',
      actor: actorId,
      targets: Array.from(targets),
      payload: {
        expenseId: expense._id,
        title: `Updated expense: ${expense.title}`,
        description: `Expense "${expense.title}" was updated`,
        amount: expense.amount,
        metadata: {
          changes
        }
      }
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating expense update activity:', error);
    return null;
  }
};

/**
 * Create an activity when an expense is deleted
 * 
 * @param {Object} expense - Deleted expense document
 * @param {string} actorId - User who deleted the expense
 * @returns {Promise<Activity>}
 */
const createExpenseDeleteActivity = async (expense, actorId) => {
  try {
    const targets = new Set();
    
    const payerId = expense.payer._id ? expense.payer._id.toString() : expense.payer.toString();
    targets.add(payerId);
    
    expense.participants.forEach(p => {
      const userId = p.user._id ? p.user._id.toString() : p.user.toString();
      targets.add(userId);
    });
    
    const activity = new Activity({
      type: 'EXPENSE_DELETED',
      actor: actorId,
      targets: Array.from(targets),
      payload: {
        expenseId: expense._id,
        title: `Deleted expense: ${expense.title}`,
        description: `Expense "${expense.title}" was deleted`,
        amount: expense.amount,
        metadata: {
          deletedAt: new Date()
        }
      }
    });
    
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error creating expense delete activity:', error);
    return null;
  }
};

/**
 * Get activity feed for a user
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} { activities, unreadCount, pagination }
 */
const getActivityFeed = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    type = null,
    unreadOnly = false
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Get activities
  const activities = await Activity.getForUser(userId, {
    limit: parseInt(limit),
    skip,
    type,
    unreadOnly
  });
  
  // Build query for total count
  const countQuery = { targets: userId };
  if (type) countQuery.type = type;
  if (unreadOnly) countQuery.isReadBy = { $ne: userId };
  
  const total = await Activity.countDocuments(countQuery);
  const unreadCount = await Activity.countUnreadForUser(userId);
  
  return {
    activities: activities.map(activity => activity.toSafeObject(userId)),
    unreadCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Mark an activity as read by a user
 * 
 * @param {string} activityId - Activity ID
 * @param {string} userId - User ID
 * @returns {Promise<Activity>}
 */
const markActivityAsRead = async (activityId, userId) => {
  const activity = await Activity.findById(activityId);
  
  if (!activity) {
    throw new Error('Activity not found');
  }
  
  // Verify user is a target of this activity
  const isTarget = activity.targets.some(
    targetId => targetId.toString() === userId.toString()
  );
  
  if (!isTarget) {
    throw new Error('You are not authorized to mark this activity as read');
  }
  
  await activity.markAsReadBy(userId);
  await activity.populate('actor', 'name email');
  
  return activity;
};

/**
 * Mark all activities as read for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of activities marked as read
 */
const markAllAsRead = async (userId) => {
  const result = await Activity.updateMany(
    {
      targets: userId,
      isReadBy: { $ne: userId }
    },
    {
      $push: { isReadBy: userId }
    }
  );
  
  return result.modifiedCount;
};

module.exports = {
  createExpenseActivity,
  createTransactionActivity,
  createExpenseUpdateActivity,
  createExpenseDeleteActivity,
  getActivityFeed,
  markActivityAsRead,
  markAllAsRead
};
