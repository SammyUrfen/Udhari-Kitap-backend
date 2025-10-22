const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { emailSearchValidation } = require('../middleware/validation');

// All user routes require authentication
router.use(requireAuth);

// Get current user info (kept for backwards compatibility)
router.get('/me', userController.getMe);

// Search for user by exact email match
router.get('/', emailSearchValidation, userController.searchByEmail);

module.exports = router;
