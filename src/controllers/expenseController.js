const Expense = require('../models/expense');
const { 
  rupeesToPaise, 
  paiseToRupees,
  validateExpenseCreation 
} = require('../services/expenseValidation');
const { 
  createExpenseActivity,
  createExpenseUpdateActivity 
} = require('../services/activityService');

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
      return res.status(400).json({
        error: 'Expense validation failed',
        message: 'The expense data contains errors',
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
 * Query params: page, limit (for future pagination)
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Find all non-deleted expenses where user is either payer or participant
    const expenses = await Expense.findActive({
      $or: [
        { payer: userId },
        { 'participants.user': userId }
      ]
    })
      .populate('payer', 'name email')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 for now, add pagination later
    
    // Format response with rupees
    const formattedExpenses = expenses.map(expense => ({
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
    }));
    
    res.json({
      success: true,
      count: formattedExpenses.length,
      expenses: formattedExpenses
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
    
    // Check if user is the creator
    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only the creator can delete this expense'
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
    
    // Check if user is the creator
    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Only the creator can edit this expense'
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
        return res.status(400).json({
          error: 'Expense validation failed',
          message: 'The updated expense data contains errors',
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
