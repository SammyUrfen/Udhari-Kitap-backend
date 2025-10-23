const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  addFriend,
  getFriends,
  getFriendById,
  updateNickname,
  removeFriend
} = require('../controllers/friendController');
const {
  validateAddFriend,
  validateUpdateNickname,
  validateFriendId
} = require('../middleware/validation');

/**
 * All friend routes require authentication
 */
router.use(requireAuth);

/**
 * POST /api/friends
 * Add a new friend by email
 * 
 * Body:
 * {
 *   "email": "friend@example.com",
 *   "nickname": "John - Roommate" (optional)
 * }
 */
router.post('/', validateAddFriend, addFriend);

/**
 * GET /api/friends
 * Get all friends for authenticated user with balance information
 * 
 * Query params:
 * - page: Page number
 * - limit: Items per page
 */
router.get('/', getFriends);

/**
 * GET /api/friends/:id
 * Get a specific friend by ID
 */
router.get('/:id', validateFriendId, getFriendById);

/**
 * PATCH /api/friends/:id
 * Update friend's nickname
 * 
 * Body:
 * {
 *   "nickname": "New Nickname"
 * }
 */
router.patch('/:id', validateUpdateNickname, updateNickname);

/**
 * DELETE /api/friends/:id
 * Remove a friend
 */
router.delete('/:id', validateFriendId, removeFriend);

module.exports = router;
