const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const expenseController = require('../controllers/expenseController');
const { createExpenseValidation } = require('../middleware/validation');

// All expense routes require authentication
router.use(requireAuth);

// Create new expense
router.post('/', createExpenseValidation, expenseController.createExpense);

// Get all expenses (non-deleted)
router.get('/', expenseController.getExpenses);

// Get single expense by ID
router.get('/:id', expenseController.getExpenseById);

module.exports = router;
