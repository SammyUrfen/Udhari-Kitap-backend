const Expense = require('../models/expense');
const { 
  rupeesToPaise, 
  paiseToRupees,
  validateExpenseCreation 
} = require('../services/expenseValidation');
const { createExpenseActivity } = require('../services/activityService');

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
 * Get all expenses (non-deleted)
 * GET /api/expenses
 * Query params: page, limit (for future pagination)
 */
exports.getExpenses = async (req, res, next) => {
  try {
    // Find all non-deleted expenses
    const expenses = await Expense.findActive()
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
