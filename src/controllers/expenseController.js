const Expense = require('../models/expense');
const Transaction = require('../models/transaction');
const { 
  rupeesToPaise, 
  paiseToRupees,
  validateExpenseCreation 
} = require('../services/expenseValidation');
const { 
  createExpenseActivity,
  createExpenseUpdateActivity,
  createExpenseDeleteActivity,
  createExpenseRestoreActivity
} = require('../services/activityService');
const { ensureBidirectionalFriendship } = require('../services/friendService');

/**
 * Expense Controller
 * Handles all expense-related operations
 */

/**
 * Create a new expense
 * POST /api/expenses
 * Body: { title, amount (in rupees), payer, participants: [{user, share (in rupees)}], splitMethod }
 * 
 * Note: Frontend sends amounts in rupees, we convert to paise for storage
 */
exports.createExpense = async (req, res, next) => {
  try {
    const { title, amount, payer, participants, splitMethod } = req.body;
    
    // Convert amounts from rupees to paise
    const amountInPaise = rupeesToPaise(amount);
    const participantsInPaise = participants.map(p => ({
      user: p.user,
      share: rupeesToPaise(p.share)
    }));
    
    // Comprehensive validation
    const validation = await validateExpenseCreation({
      amount: amountInPaise,
      payer,
      participants: participantsInPaise
    });
    
    if (!validation.valid) {
      const errorMessages = validation.errors.map(err => err.message);
      return res.status(400).json({
        error: 'Expense validation failed',
        message: errorMessages.join('; '),
        details: validation.errors
      });
    }
    
    // Create expense
    const expense = await Expense.create({
      title,
      amount: amountInPaise,
      currency: 'INR',
      payer,
      participants: participantsInPaise,
      splitMethod,
      createdBy: req.user._id
    });
    
    // Populate user details for response
    await expense.populate([
      { path: 'payer', select: 'name email' },
      { path: 'participants.user', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    // Ensure bidirectional friendships exist for all participants
    // This creates friend relationships automatically when users are added to expenses
    const allUserIds = new Set();
    allUserIds.add(payer.toString());
    participantsInPaise.forEach(p => allUserIds.add(p.user.toString()));
    
    const userIdsArray = Array.from(allUserIds);
    for (let i = 0; i < userIdsArray.length; i++) {
      for (let j = i + 1; j < userIdsArray.length; j++) {
        ensureBidirectionalFriendship(userIdsArray[i], userIdsArray[j]).catch(err => {
          console.error('Failed to create friendship:', err);
        });
      }
    }
    
    // Create activity for this expense (async, non-blocking)
    createExpenseActivity(expense, req.user._id).catch(err => {
      console.error('Failed to create expense activity:', err);
    });
    
    // Return response with amounts in both paise and rupees
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: {
        id: expense._id,
        title: expense.title,
        amount: expense.amount,
        amountInRupees: expense.getAmountInRupees(),
        currency: expense.currency,
        payer: expense.payer,
        participants: expense.participants.map(p => ({
          user: p.user,
          share: p.share,
          shareInRupees: paiseToRupees(p.share)
        })),
        splitMethod: expense.splitMethod,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all expenses (non-deleted) for the current user
 * GET /api/expenses
 * Query params: 
 * - page, limit (for pagination)
 * - includeDeleted: true/false (whether to include soft-deleted expenses)
 * - includeTransactions: true/false (whether to include settlement transactions)
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const includeDeleted = req.query.includeDeleted === 'true';
    const includeTransactions = req.query.includeTransactions === 'true';
    const limit = parseInt(req.query.limit) || 50; // Default to 50 if not specified
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {
      $or: [
        { payer: userId },
        { 'participants.user': userId }
      ]
    };
    
    // Find expenses - use findActive if not including deleted, otherwise find all
    const expenses = includeDeleted 
      ? await Expense.find(query)
          .populate('payer', 'name email')
          .populate('participants.user', 'name email')
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
      : await Expense.findActive(query)
          .populate('payer', 'name email')
          .populate('participants.user', 'name email')
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
    
    // Get total count for pagination info
    const totalCount = includeDeleted
      ? await Expense.countDocuments(query)
      : await Expense.countDocuments({ ...query, isDeleted: { $ne: true } });
    
    // Format response with rupees
    const formattedExpenses = expenses.map(expense => ({
      id: expense._id,
      _id: expense._id, // Include both for compatibility
      type: 'expense', // Add type identifier
      title: expense.title,
      amount: expense.amount,
      amountInRupees: expense.getAmountInRupees(),
      currency: expense.currency,
      payer: expense.payer,
      participants: expense.participants.map(p => ({
        user: p.user,
        share: p.share,
        shareInRupees: paiseToRupees(p.share)
      })),
      splitMethod: expense.splitMethod,
      createdBy: expense.createdBy,
      isDeleted: expense.isDeleted || false,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt
    }));
    
    let allItems = formattedExpenses;
    let transactionCount = 0;
    
    // If including transactions, fetch and merge them
    if (includeTransactions) {
      const transactionQuery = {
        $or: [
          { from: userId },
          { to: userId }
        ]
      };
      
      const transactions = await Transaction.find(transactionQuery)
        .populate('from', 'name email')
        .populate('to', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      transactionCount = await Transaction.countDocuments(transactionQuery);
      
      const formattedTransactions = transactions.map(t => ({
        id: t._id,
        _id: t._id,
        type: 'transaction', // Add type identifier
        title: `Settlement with ${t.from._id.toString() === userId.toString() ? t.to.name : t.from.name}`,
        amount: t.amount,
        amountInRupees: paiseToRupees(t.amount),
        currency: t.currency || 'INR',
        from: t.from,
        to: t.to,
        note: t.note,
        direction: t.from._id.toString() === userId.toString() ? 'sent' : 'received',
        createdBy: t.createdBy,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt || t.createdAt
      }));
      
      // Merge and sort by date
      allItems = [...formattedExpenses, ...formattedTransactions].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    
    res.json({
      success: true,
      count: allItems.length,
      total: totalCount + transactionCount,
      expenseCount: formattedExpenses.length,
      transactionCount: includeTransactions ? transactionCount : 0,
      page,
      totalPages: Math.ceil((totalCount + transactionCount) / limit),
      hasMore: skip + allItems.length < (totalCount + transactionCount),
      expenses: allItems // Changed key name to 'expenses' but contains both expenses and transactions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single expense by ID
 * GET /api/expenses/:id
 */
exports.getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findById(id)
      .populate('payer', 'name email')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email')
      .populate('comments.user', 'name email');
    
    if (!expense) {
      return res.status(404).json({
        error: 'Expense not found',
        message: `No expense found with ID ${id}`
      });
    }
    
    // Check if expense is deleted
    if (expense.isDeleted) {
      return res.status(404).json({
        error: 'Expense deleted',
        message: 'This expense has been deleted'
      });
    }
    
    res.json({
      success: true,
      expense: {
        id: expense._id,
        title: expense.title,
        amount: expense.amount,
        amountInRupees: expense.getAmountInRupees(),
        currency: expense.currency,
        payer: expense.payer,
        participants: expense.participants.map(p => ({
          user: p.user,
          share: p.share,
          shareInRupees: paiseToRupees(p.share)
        })),
        splitMethod: expense.splitMethod,
        comments: expense.comments,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Soft-delete an expense
 * DELETE /api/expenses/:id
 * Body: { reason?: string } (optional deletion reason)
 * 
 * Only the creator can delete an expense
 * Marks expense as deleted instead of removing from database
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find the expense
    const expense = await Expense.findById(id);
    
    if (!expense) {
      return res.status(404).json({
        error: 'Expense not found',
        message: `No expense found with ID ${id}`
      });
    }
    
    // Check if already deleted
    if (expense.isDeleted) {
      return res.status(400).json({
        error: 'Expense already deleted',
        message: 'This expense has already been deleted'
      });
    }
    
    // Check if user is a participant or the payer (anyone involved can delete)
    const userId = req.user._id.toString();
    const payerId = expense.payer.toString();
    const isParticipant = expense.participants.some(p => p.user.toString() === userId);
    const isPayer = payerId === userId;
    
    if (!isParticipant && !isPayer) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only participants can delete this expense'
      });
    }
    
    // Soft delete the expense
    expense.isDeleted = true;
    expense.deletedBy = req.user._id;
    expense.deletedAt = new Date();
    if (reason) {
      expense.deletedReason = reason;
    }
    
    await expense.save();
    
    // Populate for activity creation
    await expense.populate([
      { path: 'payer', select: 'name email' },
      { path: 'participants.user', select: 'name email' }
    ]);
    
    // Create activity for this deletion (async, non-blocking)
    createExpenseDeleteActivity(expense, req.user._id).catch(err => {
      console.error('Failed to create expense delete activity:', err);
    });
    
    res.json({
      success: true,
      message: 'Expense deleted successfully',
      expense: {
        id: expense._id,
        title: expense.title,
        isDeleted: expense.isDeleted,
        deletedAt: expense.deletedAt,
        deletedReason: expense.deletedReason
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Restore a soft-deleted expense
 * POST /api/expenses/:id/restore
 * 
 * Only the creator or the person who deleted it can restore
 */
exports.restoreExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find the expense (including deleted ones)
    const expense = await Expense.findById(id)
      .populate('payer', 'name email')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email');
    
    if (!expense) {
      return res.status(404).json({
        error: 'Expense not found',
        message: `No expense found with ID ${id}`
      });
    }
    
    // Check if expense is actually deleted
    if (!expense.isDeleted) {
      return res.status(400).json({
        error: 'Expense not deleted',
        message: 'This expense is not deleted and cannot be restored'
      });
    }
    
    // Check if user has permission to restore (creator or deleter)
    const userId = req.user._id.toString();
    const creatorId = expense.createdBy._id.toString();
    const deleterId = expense.deletedBy?.toString();
    
    if (userId !== creatorId && userId !== deleterId) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only the creator or the person who deleted this expense can restore it'
      });
    }
    
    // Restore the expense
    expense.isDeleted = false;
    expense.deletedBy = undefined;
    expense.deletedAt = undefined;
    expense.deletedReason = undefined;
    
    await expense.save();
    
    // Create activity for this restoration (async, non-blocking)
    createExpenseRestoreActivity(expense, req.user._id).catch(err => {
      console.error('Failed to create expense restore activity:', err);
    });
    
    res.json({
      success: true,
      message: 'Expense restored successfully',
      expense: {
        id: expense._id,
        title: expense.title,
        amount: expense.amount,
        amountInRupees: expense.getAmountInRupees(),
        currency: expense.currency,
        payer: expense.payer,
        participants: expense.participants.map(p => ({
          user: p.user,
          share: p.share,
          shareInRupees: paiseToRupees(p.share)
        })),
        splitMethod: expense.splitMethod,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update/Edit an expense
 * PATCH /api/expenses/:id
 * Body: { title?, amount?, participants?, splitMethod? }
 * 
 * Only the creator can edit an expense
 * Cannot edit deleted expenses
 * All edits go through full validation
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, amount, participants, splitMethod } = req.body;
    
    // Find the expense
    const expense = await Expense.findById(id);
    
    if (!expense) {
      return res.status(404).json({
        error: 'Expense not found',
        message: `No expense found with ID ${id}`
      });
    }
    
    // Check if expense is deleted
    if (expense.isDeleted) {
      return res.status(400).json({
        error: 'Cannot edit deleted expense',
        message: 'This expense has been deleted. Please restore it first to edit.'
      });
    }
    
    // Check if user is a participant or the payer (anyone involved can edit)
    const userId = req.user._id.toString();
    const payerId = expense.payer.toString();
    const isParticipant = expense.participants.some(p => p.user.toString() === userId);
    const isPayer = payerId === userId;
    
    if (!isParticipant && !isPayer) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only participants can edit this expense'
      });
    }
    
    // Prepare update data (only update provided fields)
    const updates = {};
    
    if (title !== undefined) {
      updates.title = title;
    }
    
    if (amount !== undefined) {
      updates.amount = rupeesToPaise(amount);
    }
    
    if (participants !== undefined) {
      updates.participants = participants.map(p => ({
        user: p.user,
        share: rupeesToPaise(p.share)
      }));
    }
    
    if (splitMethod !== undefined) {
      updates.splitMethod = splitMethod;
    }
    
    // If amount or participants are being updated, run validation
    if (updates.amount !== undefined || updates.participants !== undefined) {
      const amountToValidate = updates.amount !== undefined ? updates.amount : expense.amount;
      const participantsToValidate = updates.participants !== undefined ? updates.participants : expense.participants;
      
      const validation = await validateExpenseCreation({
        amount: amountToValidate,
        payer: expense.payer, // Payer cannot be changed
        participants: participantsToValidate
      });
      
      if (!validation.valid) {
        const errorMessages = validation.errors.map(err => err.message);
        return res.status(400).json({
          error: 'Expense validation failed',
          message: errorMessages.join('; '),
          details: validation.errors
        });
      }
    }
    
    // Apply updates
    Object.assign(expense, updates);
    await expense.save();
    
    // Populate for response
    await expense.populate([
      { path: 'payer', select: 'name email' },
      { path: 'participants.user', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);
    
    // Create activity notification for expense update
    await createExpenseUpdateActivity(expense, req.user._id, updates);
    
    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense: {
        id: expense._id,
        title: expense.title,
        amount: expense.amount,
        amountInRupees: expense.getAmountInRupees(),
        currency: expense.currency,
        payer: expense.payer,
        participants: expense.participants.map(p => ({
          user: p.user,
          share: p.share,
          shareInRupees: paiseToRupees(p.share)
        })),
        splitMethod: expense.splitMethod,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};
