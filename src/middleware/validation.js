const { body, query, param, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Auth validation rules
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// User validation rules
const emailSearchValidation = [
  query('email')
    .trim()
    .notEmpty().withMessage('Email query parameter is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  validate
];

// Expense validation rules
const createExpenseValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Expense title is required')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be at least ₹0.01'),
  
  body('payer')
    .notEmpty().withMessage('Payer is required')
    .isMongoId().withMessage('Invalid payer ID format'),
  
  body('participants')
    .isArray({ min: 1 }).withMessage('At least one participant is required')
    .custom((participants) => {
      // Validate each participant has required fields
      for (const participant of participants) {
        if (!participant.user || !participant.share) {
          throw new Error('Each participant must have user and share fields');
        }
        if (typeof participant.share !== 'number' || participant.share <= 0) {
          throw new Error('Each participant share must be a positive number');
        }
      }
      return true;
    }),
  
  body('participants.*.user')
    .notEmpty().withMessage('Participant user ID is required')
    .isMongoId().withMessage('Invalid participant user ID format'),
  
  body('participants.*.share')
    .notEmpty().withMessage('Participant share is required')
    .isFloat({ min: 0.01 }).withMessage('Participant share must be at least ₹0.01'),
  
  body('splitMethod')
    .notEmpty().withMessage('Split method is required')
    .isIn(['equal', 'unequal', 'percent']).withMessage('Split method must be equal, unequal, or percent'),
  
  validate
];

// Transaction validation rules
const validateCreateTransaction = [
  body('to')
    .notEmpty().withMessage('Recipient (to) is required')
    .isMongoId().withMessage('Invalid recipient user ID format'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be at least ₹0.01'),
  
  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Note must not exceed 200 characters'),
  
  validate
];

const validateGetTransactionById = [
  param('id')
    .notEmpty().withMessage('Transaction ID is required')
    .isMongoId().withMessage('Invalid transaction ID format'),
  
  validate
];

// Activity validation rules
const validateMarkAsRead = [
  param('id')
    .notEmpty().withMessage('Activity ID is required')
    .isMongoId().withMessage('Invalid activity ID format'),
  
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  emailSearchValidation,
  createExpenseValidation,
  validateCreateTransaction,
  validateGetTransactionById,
  validateMarkAsRead
};
