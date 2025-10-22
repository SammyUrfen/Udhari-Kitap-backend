const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true
  },
  passwordHash: { type: String, required: true, select: false },
  avatarUrl: { type: String },
}, { timestamps: true });

// Note: email index is automatically created by unique: true

// Method to return user data without sensitive fields
userSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl,
    createdAt: this.createdAt
  };
};

// Static method to find user with password hash (for login)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email }).select('+passwordHash');
};

module.exports = mongoose.model('User', userSchema);
