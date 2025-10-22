const {
  getActivityFeed,
  markActivityAsRead,
  markAllAsRead
} = require('../services/activityService');

/**
 * Activity Controller
 * Handles activity feed and notification endpoints
 */

/**
 * Get activity feed for authenticated user
 * GET /api/activities
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - type: Filter by activity type (optional)
 * - unreadOnly: Show only unread activities (optional, boolean)
 * 
 * Response:
 * {
 *   activities: [...],
 *   unreadCount: 5,
 *   pagination: { page, limit, total, totalPages }
 * }
 */
exports.getActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, type, unreadOnly } = req.query;
    
    const options = {
      page: page || 1,
      limit: limit || 20,
      type: type || null,
      unreadOnly: unreadOnly === 'true'
    };
    
    const result = await getActivityFeed(userId, options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a specific activity as read
 * PATCH /api/activities/:id/read
 * 
 * Response:
 * {
 *   message: "Activity marked as read",
 *   activity: { ... }
 * }
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const activity = await markActivityAsRead(id, userId);
    
    res.json({
      success: true,
      message: 'Activity marked as read',
      activity: activity.toSafeObject(userId)
    });
  } catch (error) {
    if (error.message === 'Activity not found') {
      return res.status(404).json({
        error: 'Activity not found'
      });
    }
    if (error.message.includes('not authorized')) {
      return res.status(403).json({
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * Mark all activities as read for authenticated user
 * PATCH /api/activities/read-all
 * 
 * Response:
 * {
 *   message: "5 activities marked as read"
 * }
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const count = await markAllAsRead(userId);
    
    res.json({
      success: true,
      message: `${count} ${count === 1 ? 'activity' : 'activities'} marked as read`,
      count
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread activity count
 * GET /api/activities/unread-count
 * 
 * Response:
 * {
 *   unreadCount: 5
 * }
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const Activity = require('../models/activity');
    
    const unreadCount = await Activity.countUnreadForUser(userId);
    
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivities: exports.getActivities,
  markAsRead: exports.markAsRead,
  markAllAsRead: exports.markAllAsRead,
  getUnreadCount: exports.getUnreadCount
};
