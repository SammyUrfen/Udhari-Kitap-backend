const {
  addFriend,
  getFriendsWithBalances,
  updateFriendNickname,
  removeFriend,
  getFriendById
} = require('../services/friendService');

/**
 * Friend Controller
 * Handles friend management endpoints
 */

/**
 * Add a new friend
 * POST /api/friends
 * 
 * Body:
 * {
 *   "email": "friend@example.com",
 *   "nickname": "John - Roommate" (optional)
 * }
 */
exports.addFriend = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email, nickname } = req.body;
    
    const result = await addFriend(userId, email, nickname);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        message: result.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: result.message,
      friend: result.friend.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all friends for authenticated user
 * GET /api/friends
 * 
 * Returns friends list with balance information
 */
exports.getFriends = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 1000 } = req.query; // Increased default to 1000 to get all friends
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const friends = await getFriendsWithBalances(userId, {
      limit: parseInt(limit),
      skip
    });
    
    // Get total count for pagination
    const Friend = require('../models/friend');
    const total = await Friend.countDocuments({ user: userId });
    
    res.json({
      success: true,
      friends,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific friend by ID
 * GET /api/friends/:id
 */
exports.getFriendById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const friendship = await getFriendById(userId, id);
    
    res.json({
      success: true,
      friend: friendship.toSafeObject()
    });
  } catch (error) {
    if (error.message === 'Friendship not found') {
      return res.status(404).json({
        error: 'Friend not found'
      });
    }
    next(error);
  }
};

/**
 * Update friend's nickname
 * PATCH /api/friends/:id
 * 
 * Body:
 * {
 *   "nickname": "New Nickname"
 * }
 */
exports.updateNickname = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { nickname } = req.body;
    
    const friendship = await updateFriendNickname(userId, id, nickname);
    
    res.json({
      success: true,
      message: 'Nickname updated successfully',
      friend: friendship.toSafeObject()
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(404).json({
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * Remove a friend
 * DELETE /api/friends/:id
 */
exports.removeFriend = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    await removeFriend(userId, id);
    
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(404).json({
        error: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  addFriend: exports.addFriend,
  getFriends: exports.getFriends,
  getFriendById: exports.getFriendById,
  updateNickname: exports.updateNickname,
  removeFriend: exports.removeFriend
};
