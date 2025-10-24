const { body, query, param, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    const errorMessages = errorArray.map(err => err.msg);
    
    return res.status(400).json({ 
      error: 'Validation failed', 
      message: errorMessages.length === 1 ? errorMessages[0] : errorMessages.join('; '),
      details: errorArray 
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
        if (!participant.user || participant.share === undefined || participant.share === null) {
          throw new Error('Each participant must have user and share fields');
        }
        if (typeof participant.share !== 'number' || participant.share < 0) {
          throw new Error('Each participant share must be a non-negative number');
        }
      }
      return true;
    }),
  
  body('participants.*.user')
    .notEmpty().withMessage('Participant user ID is required')
    .isMongoId().withMessage('Invalid participant user ID format'),
  
  body('participants.*.share')
    .notEmpty().withMessage('Participant share is required')
    .isFloat({ min: 0 }).withMessage('Participant share must be at least ₹0'),
  
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

// Expense update validation rules (similar to create, but all fields optional)
const updateExpenseValidation = [
  param('id')
    .notEmpty().withMessage('Expense ID is required')
    .isMongoId().withMessage('Invalid expense ID format'),
  
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be at least ₹0.01'),
  
  body('participants')
    .optional()
    .isArray({ min: 1 }).withMessage('At least one participant is required')
    .custom((participants) => {
      // Validate each participant has required fields
      for (const participant of participants) {
        if (!participant.user || participant.share === undefined || participant.share === null) {
          throw new Error('Each participant must have user and share fields');
        }
        if (typeof participant.share !== 'number' || participant.share < 0) {
          throw new Error('Each participant share must be a non-negative number');
        }
      }
      return true;
    }),
  
  body('participants.*.user')
    .optional()
    .isMongoId().withMessage('Each participant user must be a valid MongoDB ID'),
  
  body('splitMethod')
    .optional()
    .isIn(['equal', 'unequal', 'percent']).withMessage('Split method must be equal, unequal, or percent'),
  
  validate
];

// Expense delete validation rules
const deleteExpenseValidation = [
  param('id')
    .notEmpty().withMessage('Expense ID is required')
    .isMongoId().withMessage('Invalid expense ID format'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Deletion reason cannot exceed 200 characters'),
  
  validate
];

// Expense restore validation rules
const restoreExpenseValidation = [
  param('id')
    .notEmpty().withMessage('Expense ID is required')
    .isMongoId().withMessage('Invalid expense ID format'),
  
  validate
];

// Expense ID validation (for getting single expense)
const validateExpenseId = [
  param('id')
    .notEmpty().withMessage('Expense ID is required')
    .isMongoId().withMessage('Invalid expense ID format'),
  
  validate
];

// Friend validation rules
const validateAddFriend = [
  body('email')
    .trim()
    .notEmpty().withMessage('Friend email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('nickname')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Nickname must not exceed 50 characters'),
  
  validate
];

const validateUpdateNickname = [
  param('id')
    .notEmpty().withMessage('Friend ID is required')
    .isMongoId().withMessage('Invalid friend ID format'),
  
  body('nickname')
    .trim()
    .notEmpty().withMessage('Nickname is required')
    .isLength({ max: 50 }).withMessage('Nickname must not exceed 50 characters'),
  
  validate
];

const validateFriendId = [
  param('id')
    .notEmpty().withMessage('Friend ID is required')
    .isMongoId().withMessage('Invalid friend ID format'),
  
  validate
];

module.exports = {
  registerValidation,
  loginValidation,
  emailSearchValidation,
  createExpenseValidation,
  updateExpenseValidation,
  deleteExpenseValidation,
  restoreExpenseValidation,
  validateExpenseId,
  validateCreateTransaction,
  validateGetTransactionById,
  validateMarkAsRead,
  validateAddFriend,
  validateUpdateNickname,
  validateFriendId
};
