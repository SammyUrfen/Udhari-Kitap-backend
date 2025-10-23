const Transaction = require('../models/transaction');
const { validateTransactionCreation } = require('../services/transactionValidation');
const { rupeesToPaise, paiseToRupees } = require('../services/expenseValidation');
const { createTransactionActivity } = require('../services/activityService');

/**
 * Create a new transaction
 * 
 * Request body:
 * {
 *   to: string (user ID who receives the payment),
 *   amount: number (in rupees),
 *   note: string (optional),
 *   from: string (optional - user ID who makes the payment, defaults to authenticated user)
 * }
 * 
 * By default, 'from' is the authenticated user (you are paying someone).
 * If 'from' is provided and different from authenticated user, you are recording a payment you received.
 */
exports.createTransaction = async (req, res, next) => {
  try {
    const { to, amount, note, from: providedFrom } = req.body;
    const authenticatedUserId = req.user.id;
    
    // Determine the actual 'from' user
    // If 'from' is provided, it means we're recording a payment received (they paid us)
    // Otherwise, we're recording a payment made (we paid them)
    const from = providedFrom || authenticatedUserId;
    
    // Validation: If 'from' is provided, 'to' must be the authenticated user
    if (providedFrom && providedFrom !== authenticatedUserId && to !== authenticatedUserId) {
      return res.status(400).json({
        error: 'Invalid transaction',
        details: ['When specifying a different payer, you must be the recipient']
      });
    }
    
    // Validation check - from user is paying to another user
    const validation = await validateTransactionCreation({
      from,
      to,
      amount
    });
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    // Convert amount to paise
    const amountInPaise = rupeesToPaise(amount);
    
    // Create transaction (createdBy is always the authenticated user)
    const transaction = new Transaction({
      from,
      to,
      amount: amountInPaise,
      note,
      createdBy: authenticatedUserId
    });
    
    await transaction.save();
    
    // Populate user details
    await transaction.populate('from', 'name email');
    await transaction.populate('to', 'name email');
    await transaction.populate('createdBy', 'name email');
    
    // Create activity for this transaction (async, non-blocking)
    createTransactionActivity(transaction, authenticatedUserId).catch(err => {
      console.error('Failed to create transaction activity:', err);
    });
    
    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: {
        id: transaction._id,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        amountInRupees: paiseToRupees(transaction.amount),
        note: transaction.note,
        createdBy: transaction.createdBy,
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all transactions for the authenticated user
 * GET /api/transactions
 * 
 * Query params:
 * - withUser: Filter transactions with a specific user ID
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { withUser, page = 1, limit = 20 } = req.query;
    
    // Build query - find all transactions where user is sender or receiver
    const query = {
      $or: [
        { from: userId },
        { to: userId }
      ]
    };
    
    // If filtering by specific user
    if (withUser) {
      query.$or = [
        { from: userId, to: withUser },
        { from: withUser, to: userId }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get transactions
    const transactions = await Transaction.find(query)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Transaction.countDocuments(query);
    
    // Format response
    const formattedTransactions = transactions.map(t => ({
      id: t._id,
      from: t.from,
      to: t.to,
      amount: t.amount,
      amountInRupees: paiseToRupees(t.amount),
      note: t.note,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      direction: t.from._id.toString() === userId ? 'sent' : 'received'
    }));
    
    res.json({
      transactions: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single transaction by ID
 * GET /api/transactions/:id
 */
exports.getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const transaction = await Transaction.findById(id)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('createdBy', 'name email');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Check if user is involved in this transaction
    const fromId = transaction.from._id.toString();
    const toId = transaction.to._id.toString();
    
    if (fromId !== userId && toId !== userId) {
      return res.status(403).json({ 
        error: 'You are not authorized to view this transaction' 
      });
    }
    
    res.json({
      transaction: {
        id: transaction._id,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        amountInRupees: paiseToRupees(transaction.amount),
        note: transaction.note,
        createdBy: transaction.createdBy,
        createdAt: transaction.createdAt,
        direction: fromId === userId ? 'sent' : 'received'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction: exports.createTransaction,
  getTransactions: exports.getTransactions,
  getTransactionById: exports.getTransactionById
};
