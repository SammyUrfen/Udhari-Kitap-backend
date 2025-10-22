const mongoose = require('mongoose');

/**
 * Transaction Schema
 * Represents a settlement/payment between two users
 * 
 * Example: Bob pays Alice ₹100 to settle their balance
 * - from: Bob's user ID
 * - to: Alice's user ID
 * - amount: 10000 (paise)
 * 
 * All amounts stored in paise to avoid floating-point errors
 */
const transactionSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'From user is required'],
    index: true
  },
  
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'To user is required'],
    index: true
  },
  
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1 paise']
  },
  
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR'],
    immutable: true
  },
  
  note: {
    type: String,
    trim: true,
    maxlength: [200, 'Note cannot exceed 200 characters']
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  }
}, {
  timestamps: true
});

// Composite indexes for efficient queries
transactionSchema.index({ from: 1, createdAt: -1 });
transactionSchema.index({ to: 1, createdAt: -1 });
transactionSchema.index({ from: 1, to: 1 });
transactionSchema.index({ createdAt: -1 });

/**
 * Validate that 'from' and 'to' are different users
 */
transactionSchema.pre('save', function(next) {
  if (this.from.toString() === this.to.toString()) {
    return next(new Error('Cannot create transaction where from and to are the same user'));
  }
  next();
});

/**
 * Method to convert amount from paise to rupees
 */
transactionSchema.methods.getAmountInRupees = function() {
  return this.amount / 100;
};

/**
 * Method to return safe transaction object for API responses
 */
transactionSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    from: this.from,
    to: this.to,
    amount: this.amount,
    amountInRupees: this.getAmountInRupees(),
    currency: this.currency,
    note: this.note,
    createdBy: this.createdBy,
    createdAt: this.createdAt
  };
};

/**
 * Static method to find transactions involving a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of transactions
 */
transactionSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { from: userId },
      { to: userId }
    ]
  })
  .populate('from', 'name email')
  .populate('to', 'name email')
  .populate('createdBy', 'name email')
  .sort({ createdAt: -1 });
};

/**
 * Static method to find transactions between two specific users
 * @param {string} user1Id - First user ID
 * @param {string} user2Id - Second user ID
 * @returns {Promise<Array>} Array of transactions between the two users
 */
transactionSchema.statics.findBetweenUsers = function(user1Id, user2Id) {
  return this.find({
    $or: [
      { from: user1Id, to: user2Id },
      { from: user2Id, to: user1Id }
    ]
  })
  .populate('from', 'name email')
  .populate('to', 'name email')
  .populate('createdBy', 'name email')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Transaction', transactionSchema);
