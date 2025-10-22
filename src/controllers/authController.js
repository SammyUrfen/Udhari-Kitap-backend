const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { jwtSecret } = require('../config');

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { name, email, password }
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ 
        error: 'Email already registered',
        message: 'A user with this email already exists' 
      });
    }

    // Hash password with salt rounds of 12 for better security
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      passwordHash 
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      jwtSecret, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      success: true,
      user: user.toSafeObject(),
      token 
    });
  } catch (err) {
    // Handle mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ 
        error: 'Email already registered',
        message: 'A user with this email already exists' 
      });
    }
    next(err);
  }
};

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password hash
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      jwtSecret, 
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true,
      user: user.toSafeObject(),
      token 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 * Requires: Authorization header
 */
exports.getMe = async (req, res, next) => {
  try {
    // req.user is set by requireAuth middleware
    res.json({ 
      success: true,
      user: req.user.toSafeObject() 
    });
  } catch (err) {
    next(err);
  }
};
