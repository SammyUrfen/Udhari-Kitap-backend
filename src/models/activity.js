const mongoose = require('mongoose');

/**
 * Activity Model
 * 
 * Tracks all activities/events in the system for the activity feed.
 * Activities are created when users perform actions like creating expenses,
 * making payments, etc.
 * 
 * Activity Types:
 * - EXPENSE_CREATED: When a new expense is created
 * - EXPENSE_UPDATED: When an expense is modified
 * - EXPENSE_DELETED: When an expense is soft-deleted
 * - EXPENSE_RESTORED: When a deleted expense is restored
 * - TRANSACTION_CREATED: When a payment/settlement is made
 * - FRIEND_ADDED_YOU: When someone adds you as a friend
 * - YOU_ADDED_FRIEND: When you add someone as a friend
 * - USER_ADDED: When a user is added to an expense
 */

const activitySchema = new mongoose.Schema({
  // Type of activity
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: [
      'EXPENSE_CREATED',
      'EXPENSE_UPDATED', 
      'EXPENSE_DELETED',
      'EXPENSE_RESTORED',
      'TRANSACTION_CREATED',
      'FRIEND_ADDED_YOU',
      'YOU_ADDED_FRIEND',
      'USER_ADDED'
    ],
    index: true
  },
  
  // User who performed the action
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Actor is required'],
    index: true
  },
  
  // Users who should see this activity (participants in the expense/transaction)
  targets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Activity-specific data
  payload: {
    // Reference to the expense or transaction
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense'
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    
    // Human-readable title and description
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    
    // Amount involved (in paise)
    amount: {
      type: Number,
      min: 0
    },
    
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  
  // Array of user IDs who have marked this activity as read
  isReadBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
activitySchema.index({ targets: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

/**
 * Check if a specific user has read this activity
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
activitySchema.methods.isReadByUser = function(userId) {
  return this.isReadBy.some(id => id.toString() === userId.toString());
};

/**
 * Mark activity as read by a user
 * @param {string} userId - User ID
 * @returns {Promise<Activity>}
 */
activitySchema.methods.markAsReadBy = async function(userId) {
  if (!this.isReadByUser(userId)) {
    this.isReadBy.push(userId);
    await this.save();
  }
  return this;
};

/**
 * Mark activity as unread by a user
 * @param {string} userId - User ID
 * @returns {Promise<Activity>}
 */
activitySchema.methods.markAsUnreadBy = async function(userId) {
  this.isReadBy = this.isReadBy.filter(id => id.toString() !== userId.toString());
  await this.save();
  return this;
};

/**
 * Get activities for a specific user (where they are in targets)
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, skip, type filter)
 * @returns {Promise<Array<Activity>>}
 */
activitySchema.statics.getForUser = async function(userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    type = null,
    unreadOnly = false
  } = options;
  
  const query = { targets: userId };
  
  // Filter by activity type if specified
  if (type) {
    query.type = type;
  }
  
  // Filter for unread activities only
  if (unreadOnly) {
    query.isReadBy = { $ne: userId };
  }
  
  return this.find(query)
    .populate('actor', 'name email')
    .populate('targets', 'name email')
    .populate('payload.expenseId', 'title amount')
    .populate('payload.transactionId', 'amount note')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Count unread activities for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
activitySchema.statics.countUnreadForUser = async function(userId) {
  return this.countDocuments({
    targets: userId,
    isReadBy: { $ne: userId }
  });
};

/**
 * Get safe object for API response
 * @param {string} currentUserId - Current user's ID to determine read status
 * @returns {Object}
 */
activitySchema.methods.toSafeObject = function(currentUserId) {
  return {
    id: this._id,
    type: this.type,
    actor: this.actor,
    payload: {
      title: this.payload.title,
      description: this.payload.description,
      amount: this.payload.amount,
      expenseId: this.payload.expenseId,
      transactionId: this.payload.transactionId,
      metadata: this.payload.metadata
    },
    isRead: currentUserId ? this.isReadByUser(currentUserId) : false,
    createdAt: this.createdAt
  };
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
