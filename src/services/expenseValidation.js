const User = require('../models/user');

/**
 * Expense Validation Service
 * Contains business logic for validating expense data
 * Keeps controllers clean and logic reusable
 */

/**
 * Convert rupees to paise (multiply by 100 and round)
 * @param {number} rupees - Amount in rupees (can have decimals)
 * @returns {number} Amount in paise (integer)
 */
const rupeesToPaise = (rupees) => {
  return Math.round(rupees * 100);
};

/**
 * Convert paise to rupees (divide by 100)
 * @param {number} paise - Amount in paise (integer)
 * @returns {number} Amount in rupees (with decimals)
 */
const paiseToRupees = (paise) => {
  return paise / 100;
};

/**
 * Validate that all participant user IDs exist in the database
 * @param {Array} participants - Array of {user: userId, share: amount}
 * @returns {Promise<Object>} { valid: boolean, invalidIds: Array, message: string }
 */
const validateParticipantsExist = async (participants) => {
  // Extract unique user IDs
  const userIds = [...new Set(participants.map(p => p.user))];
  
  // Check if all users exist
  const users = await User.find({ _id: { $in: userIds } }).select('_id');
  const foundIds = users.map(u => u._id.toString());
  
  // Find any invalid IDs
  const invalidIds = userIds.filter(id => !foundIds.includes(id.toString()));
  
  if (invalidIds.length > 0) {
    return {
      valid: false,
      invalidIds,
      message: `The following user IDs do not exist: ${invalidIds.join(', ')}`
    };
  }
  
  return { valid: true, invalidIds: [], message: 'All participants are valid' };
};

/**
 * Validate that payer exists and is a valid user
 * @param {string} payerId - User ID of the payer
 * @returns {Promise<Object>} { valid: boolean, message: string }
 */
const validatePayerExists = async (payerId) => {
  const payer = await User.findById(payerId);
  
  if (!payer) {
    return {
      valid: false,
      message: `Payer with ID ${payerId} does not exist`
    };
  }
  
  return { valid: true, message: 'Payer is valid' };
};

/**
 * Validate that sum of participant shares equals total amount
 * Allows 1 paise tolerance for rounding differences
 * @param {number} totalAmount - Total expense amount in paise
 * @param {Array} participants - Array of {user: userId, share: amount in paise}
 * @returns {Object} { valid: boolean, totalShares: number, difference: number, message: string }
 */
const validateSharesSum = (totalAmount, participants) => {
  const totalShares = participants.reduce((sum, p) => sum + p.share, 0);
  const difference = Math.abs(totalShares - totalAmount);
  
  // Allow 1 paise tolerance for rounding
  if (difference > 1) {
    return {
      valid: false,
      totalShares,
      difference,
      message: `Sum of participant shares (${totalShares} paise = ₹${paiseToRupees(totalShares)}) does not equal total amount (${totalAmount} paise = ₹${paiseToRupees(totalAmount)}). Difference: ${difference} paise`
    };
  }
  
  return {
    valid: true,
    totalShares,
    difference,
    message: 'Shares sum is valid'
  };
};

/**
 * Validate that all participant shares are non-negative
 * @param {Array} participants - Array of {user: userId, share: amount}
 * @returns {Object} { valid: boolean, invalidParticipants: Array, message: string }
 */
const validatePositiveShares = (participants) => {
  const invalidParticipants = participants.filter(p => p.share < 0);
  
  if (invalidParticipants.length > 0) {
    return {
      valid: false,
      invalidParticipants,
      message: 'All participant shares must be non-negative (≥ 0)'
    };
  }
  
  return { valid: true, invalidParticipants: [], message: 'All shares are valid' };
};

/**
 * Validate that there are no duplicate participants
 * @param {Array} participants - Array of {user: userId, share: amount}
 * @returns {Object} { valid: boolean, duplicates: Array, message: string }
 */
const validateNoDuplicateParticipants = (participants) => {
  const userIds = participants.map(p => p.user.toString());
  const uniqueIds = new Set(userIds);
  
  if (userIds.length !== uniqueIds.size) {
    // Find duplicates
    const duplicates = userIds.filter((id, index) => userIds.indexOf(id) !== index);
    return {
      valid: false,
      duplicates: [...new Set(duplicates)],
      message: 'Duplicate participants found. Each user can only appear once in an expense.'
    };
  }
  
  return { valid: true, duplicates: [], message: 'No duplicate participants' };
};

/**
 * Comprehensive validation for expense creation
 * Runs all validations and returns combined result
 * @param {Object} expenseData - { amount, payer, participants }
 * @returns {Promise<Object>} { valid: boolean, errors: Array }
 */
const validateExpenseCreation = async (expenseData) => {
  const { amount, payer, participants } = expenseData;
  const errors = [];
  
  // 1. Validate payer exists
  const payerValidation = await validatePayerExists(payer);
  if (!payerValidation.valid) {
    errors.push({ field: 'payer', message: payerValidation.message });
  }
  
  // 2. Validate no duplicate participants
  const duplicateValidation = validateNoDuplicateParticipants(participants);
  if (!duplicateValidation.valid) {
    errors.push({ field: 'participants', message: duplicateValidation.message });
  }
  
  // 3. Validate all participants exist
  const participantsValidation = await validateParticipantsExist(participants);
  if (!participantsValidation.valid) {
    errors.push({ field: 'participants', message: participantsValidation.message });
  }
  
  // 4. Validate positive shares
  const positiveValidation = validatePositiveShares(participants);
  if (!positiveValidation.valid) {
    errors.push({ field: 'participants', message: positiveValidation.message });
  }
  
  // 5. Validate shares sum equals total
  const sumValidation = validateSharesSum(amount, participants);
  if (!sumValidation.valid) {
    errors.push({ field: 'amount', message: sumValidation.message });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  rupeesToPaise,
  paiseToRupees,
  validateParticipantsExist,
  validatePayerExists,
  validateSharesSum,
  validatePositiveShares,
  validateNoDuplicateParticipants,
  validateExpenseCreation
};
