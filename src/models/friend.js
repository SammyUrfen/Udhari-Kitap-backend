const mongoose = require('mongoose');

/**
 * Friend Model
 * 
 * Represents a friendship between two users in the system.
 * Each user can add other users as friends and give them custom nicknames.
 * This makes it easier to create expenses with frequently-used contacts.
 * 
 * Note: This is a one-way relationship. If Alice adds Bob as a friend,
 * it doesn't automatically make Alice a friend of Bob.
 */

const friendSchema = new mongoose.Schema({
  // The user who owns this friend relationship
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  
  // The friend (another user in the system)
  friend: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Friend user is required'],
    index: true
  },
  
  // Custom nickname for this friend (optional)
  // e.g., "John - College Roommate", "Sarah 🏠", etc.
  nickname: {
    type: String,
    trim: true,
    maxlength: [50, 'Nickname cannot exceed 50 characters']
  },
  
  // When the friendship was created
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Last time nickname was updated or any interaction happened
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure a user can't add the same friend twice
friendSchema.index({ user: 1, friend: 1 }, { unique: true });

// Index for quick lookups
friendSchema.index({ user: 1, createdAt: -1 });

/**
 * Pre-save validation to prevent self-friending
 */
friendSchema.pre('save', function(next) {
  if (this.user.toString() === this.friend.toString()) {
    const error = new Error('Cannot add yourself as a friend');
    return next(error);
  }
  next();
});

/**
 * Get a user-friendly object for this friend
 * @returns {Object} Safe friend object
 */
friendSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    friend: this.friend,
    nickname: this.nickname,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

/**
 * Get all friends for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
friendSchema.statics.getFriendsForUser = async function(userId, options = {}) {
  const { limit = 100, skip = 0 } = options;
  
  return this.find({ user: userId })
    .populate('friend', 'name email profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Check if a friendship exists
 * @param {string} userId - User ID
 * @param {string} friendId - Friend user ID
 * @returns {Promise<boolean>}
 */
friendSchema.statics.friendshipExists = async function(userId, friendId) {
  const friendship = await this.findOne({ user: userId, friend: friendId });
  return !!friendship;
};

/**
 * Remove a friend
 * @param {string} userId - User ID
 * @param {string} friendId - Friend user ID
 * @returns {Promise<Object>}
 */
friendSchema.statics.removeFriend = async function(userId, friendId) {
  return this.findOneAndDelete({ user: userId, friend: friendId });
};

const Friend = mongoose.model('Friend', friendSchema);

module.exports = Friend;
