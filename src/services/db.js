const mongoose = require('mongoose');
const { mongoUri } = require('../config');

async function connectDB() {
  try {
    // Remove deprecated options - they're no longer needed in Mongoose 6+
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.error('✗ MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = { connectDB };
