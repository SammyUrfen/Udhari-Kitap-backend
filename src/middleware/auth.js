const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const User = require('../models/user');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 * Expects: Authorization: Bearer <token>
 */
exports.requireAuth = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authorization required',
        message: 'No authorization header provided' 
      });
    }

    // Check if it follows Bearer scheme
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Invalid authorization format',
        message: 'Authorization header must be: Bearer <token>' 
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        error: 'Token missing',
        message: 'No token provided in authorization header' 
      });
    }

    // Verify token
    const payload = jwt.verify(token, jwtSecret);

    // Find user and exclude password
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'The user associated with this token no longer exists' 
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    // Handle specific JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid' 
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please login again' 
      });
    }
    // Pass other errors to global error handler
    next(err);
  }
};
