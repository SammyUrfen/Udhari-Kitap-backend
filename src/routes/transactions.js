const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { 
  createTransaction, 
  getTransactions, 
  getTransactionById 
} = require('../controllers/transactionController');
const { 
  validateCreateTransaction,
  validateGetTransactionById 
} = require('../middleware/validation');

/**
 * All transaction routes require authentication
 */
router.use(requireAuth);

/**
 * POST /api/transactions
 * Create a new transaction (settlement/payment)
 * 
 * Body:
 * {
 *   "to": "userId",
 *   "amount": 100.50,
 *   "note": "Optional note"
 * }
 */
router.post('/', validateCreateTransaction, createTransaction);

/**
 * GET /api/transactions
 * Get all transactions for authenticated user
 * 
 * Query params:
 * - withUser: Filter by specific user ID
 * - page: Page number
 * - limit: Items per page
 */
router.get('/', getTransactions);

/**
 * GET /api/transactions/:id
 * Get a specific transaction by ID
 */
router.get('/:id', validateGetTransactionById, getTransactionById);

module.exports = router;
