const User = require('../models/user');
const { 
  calculateOverallBalance, 
  calculatePairwiseBalance 
} = require('../services/balanceCalculation');

/**
 * Balance Controller
 * Handles balance calculation and retrieval
 */

/**
 * Get overall balance for authenticated user
 * GET /api/balances
 * 
 * Returns:
 * - Total amount others owe you
 * - Total amount you owe others
 * - Net balance
 * - Per-user breakdown
 */
exports.getOverallBalance = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Calculate overall balance
    const balanceData = await calculateOverallBalance(userId);
    
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      },
      balance: balanceData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get pairwise balance with a specific user
 * GET /api/balances/:userId
 * 
 * Returns balance between authenticated user and specified user
 * Positive = they owe you
 * Negative = you owe them
 * Zero = settled
 */
exports.getPairwiseBalance = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;
    
    // Validate that the other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with ID ${otherUserId}`
      });
    }
    
    // Don't allow checking balance with yourself
    if (currentUserId.toString() === otherUserId.toString()) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Cannot check balance with yourself'
      });
    }
    
    // Calculate pairwise balance
    const balanceData = await calculatePairwiseBalance(currentUserId, otherUserId);
    
    res.json({
      success: true,
      you: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      },
      otherUser: {
        id: otherUser._id,
        name: otherUser.name,
        email: otherUser.email
      },
      balance: balanceData
    });
  } catch (err) {
    next(err);
  }
};
