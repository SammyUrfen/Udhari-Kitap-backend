const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');
const { 
  createExpenseValidation,
  updateExpenseValidation,
  deleteExpenseValidation,
  restoreExpenseValidation,
  validateExpenseId
} = require('../middleware/validation');

// All expense routes require authentication
router.use(requireAuth);

// Create new expense
router.post('/', createExpenseValidation, expenseController.createExpense);

// Get all expenses (non-deleted)
router.get('/', expenseController.getExpenses);

// Get single expense by ID
router.get('/:id', validateExpenseId, expenseController.getExpenseById);

// Update/Edit expense
router.patch('/:id', updateExpenseValidation, expenseController.updateExpense);

// Soft-delete expense
router.delete('/:id', deleteExpenseValidation, expenseController.deleteExpense);

// Restore deleted expense
router.post('/:id/restore', restoreExpenseValidation, expenseController.restoreExpense);

module.exports = router;
