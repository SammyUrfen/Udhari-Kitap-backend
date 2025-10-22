const mongoose = require('mongoose');

/**
 * Participant Schema
 * Represents a single participant in an expense
 * All amounts are stored in paise (1 rupee = 100 paise) to avoid floating point issues
 */
const participantSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  share: { 
    type: Number, 
    required: true,
    min: [0, 'Share amount cannot be negative']
  }
}, { _id: false }); // Don't create separate IDs for sub-documents

/**
 * Comment Schema
 * For expense-related discussions
 */
const commentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: true });

/**
 * Expense Schema
 * Stores all expense information with amounts in paise
 * Currency is fixed to INR (₹) for this application
 */
const expenseSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Expense title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
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
    immutable: true // Currency cannot be changed after creation
  },
  
  payer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Payer is required']
  },
  
  participants: {
    type: [participantSchema],
    validate: {
      validator: function(participants) {
        return participants && participants.length > 0;
      },
      message: 'At least one participant is required'
    }
  },
  
  splitMethod: { 
    type: String, 
    required: [true, 'Split method is required'],
    enum: {
      values: ['equal', 'unequal', 'percent'],
      message: 'Split method must be equal, unequal, or percent'
    }
  },
  
  comments: [commentSchema],
  
  isDeleted: { 
    type: Boolean, 
    default: false,
    index: true // Index for filtering out deleted expenses
  },
  
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  deletedAt: { 
    type: Date 
  },
  
  deletedReason: { 
    type: String,
    trim: true,
    maxlength: [200, 'Deletion reason cannot exceed 200 characters']
  },
  
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Creator is required']
  }
}, { 
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for common queries
expenseSchema.index({ createdAt: -1 }); // Sort by newest first
expenseSchema.index({ payer: 1 }); // Find expenses paid by user
expenseSchema.index({ 'participants.user': 1 }); // Find expenses involving user
expenseSchema.index({ isDeleted: 1, createdAt: -1 }); // Composite index for active expenses

/**
 * Method to convert amount from paise to rupees for display
 */
expenseSchema.methods.getAmountInRupees = function() {
  return this.amount / 100;
};

/**
 * Method to get participants with amounts in rupees
 */
expenseSchema.methods.getParticipantsInRupees = function() {
  return this.participants.map(p => ({
    user: p.user,
    share: p.share / 100
  }));
};

/**
 * Method to return safe expense object for API responses
 */
expenseSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    title: this.title,
    amount: this.amount,
    amountInRupees: this.getAmountInRupees(),
    currency: this.currency,
    payer: this.payer,
    participants: this.participants,
    splitMethod: this.splitMethod,
    comments: this.comments,
    isDeleted: this.isDeleted,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

/**
 * Static method to find non-deleted expenses
 */
expenseSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: false });
};

/**
 * Pre-save hook to validate that shares sum equals total amount
 * This is a safety net in addition to controller validation
 */
expenseSchema.pre('save', function(next) {
  // Skip validation if document is being deleted (not modified)
  if (!this.isModified('participants') && !this.isModified('amount')) {
    return next();
  }

  const totalShares = this.participants.reduce((sum, p) => sum + p.share, 0);
  
  // Allow 1 paise tolerance for rounding differences
  if (Math.abs(totalShares - this.amount) > 1) {
    return next(new Error(
      `Sum of participant shares (${totalShares} paise) must equal total amount (${this.amount} paise)`
    ));
  }
  
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
