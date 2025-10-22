const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getActivities,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../controllers/activityController');
const { validateMarkAsRead } = require('../middleware/validation');

/**
 * All activity routes require authentication
 */
router.use(requireAuth);

/**
 * GET /api/activities/unread-count
 * Get count of unread activities
 * Must come before /:id routes to avoid matching 'unread-count' as an ID
 */
router.get('/unread-count', getUnreadCount);

/**
 * GET /api/activities
 * Get activity feed for authenticated user
 * 
 * Query params:
 * - page: Page number
 * - limit: Items per page
 * - type: Filter by activity type
 * - unreadOnly: Show only unread (true/false)
 */
router.get('/', getActivities);

/**
 * PATCH /api/activities/read-all
 * Mark all activities as read for authenticated user
 */
router.patch('/read-all', markAllAsRead);

/**
 * PATCH /api/activities/:id/read
 * Mark a specific activity as read
 */
router.patch('/:id/read', validateMarkAsRead, markAsRead);

module.exports = router;
