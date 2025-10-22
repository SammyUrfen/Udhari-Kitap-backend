const User = require('../models/user');

/**
 * Get current authenticated user (kept for backwards compatibility)
 * GET /api/users/me
 * Requires: Authorization header
 * Note: /api/auth/me is the preferred endpoint
 */
exports.getMe = (req, res) => {
  res.json({ 
    success: true,
    user: req.user.toSafeObject() 
  });
};

/**
 * Search for a user by exact email match
 * GET /api/users?email=user@example.com
 * Requires: Authorization header
 * Purpose: Contact discovery - check if someone exists before adding to expense
 */
exports.searchByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;

    // Find user by exact email match
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({ 
        success: true,
        found: false,
        message: 'No user found with this email' 
      });
    }

    // Return only public user info (no sensitive data)
    res.json({ 
      success: true,
      found: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    next(err);
  }
};
