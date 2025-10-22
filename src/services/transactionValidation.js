const User = require('../models/user');

/**
 * Transaction Validation Service
 * Contains business logic for validating transaction/settlement data
 */

/**
 * Validate that both users exist
 * @param {string} fromUserId - User ID of sender
 * @param {string} toUserId - User ID of receiver
 * @returns {Promise<Object>} { valid: boolean, fromUser: User, toUser: User, message: string }
 */
const validateUsersExist = async (fromUserId, toUserId) => {
  const fromUser = await User.findById(fromUserId);
  const toUser = await User.findById(toUserId);
  
  if (!fromUser) {
    return {
      valid: false,
      message: `User with ID ${fromUserId} does not exist`
    };
  }
  
  if (!toUser) {
    return {
      valid: false,
      message: `User with ID ${toUserId} does not exist`
    };
  }
  
  return {
    valid: true,
    fromUser,
    toUser,
    message: 'Both users are valid'
  };
};

/**
 * Validate that from and to users are different
 * @param {string} fromUserId - User ID of sender
 * @param {string} toUserId - User ID of receiver
 * @returns {Object} { valid: boolean, message: string }
 */
const validateDifferentUsers = (fromUserId, toUserId) => {
  if (fromUserId.toString() === toUserId.toString()) {
    return {
      valid: false,
      message: 'Cannot create transaction where sender and receiver are the same user'
    };
  }
  
  return {
    valid: true,
    message: 'Users are different'
  };
};

/**
 * Validate that amount is positive
 * @param {number} amount - Amount in paise
 * @returns {Object} { valid: boolean, message: string }
 */
const validatePositiveAmount = (amount) => {
  if (!amount || amount <= 0) {
    return {
      valid: false,
      message: 'Amount must be greater than zero'
    };
  }
  
  return {
    valid: true,
    message: 'Amount is valid'
  };
};

/**
 * Comprehensive validation for transaction creation
 * @param {Object} transactionData - { from, to, amount }
 * @returns {Promise<Object>} { valid: boolean, errors: Array, fromUser: User, toUser: User }
 */
const validateTransactionCreation = async (transactionData) => {
  const { from, to, amount } = transactionData;
  const errors = [];
  
  // 1. Validate users are different
  const differentValidation = validateDifferentUsers(from, to);
  if (!differentValidation.valid) {
    errors.push({ field: 'users', message: differentValidation.message });
  }
  
  // 2. Validate amount is positive
  const amountValidation = validatePositiveAmount(amount);
  if (!amountValidation.valid) {
    errors.push({ field: 'amount', message: amountValidation.message });
  }
  
  // 3. Validate users exist
  const usersValidation = await validateUsersExist(from, to);
  if (!usersValidation.valid) {
    errors.push({ field: 'users', message: usersValidation.message });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    fromUser: usersValidation.fromUser,
    toUser: usersValidation.toUser
  };
};

module.exports = {
  validateUsersExist,
  validateDifferentUsers,
  validatePositiveAmount,
  validateTransactionCreation
};
