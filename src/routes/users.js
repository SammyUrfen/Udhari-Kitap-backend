const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { emailSearchValidation } = require('../middleware/validation');
const { uploadProfilePicture, handleUploadError } = require('../middleware/upload');

// All user routes require authentication
router.use(requireAuth);

// Get current user info (kept for backwards compatibility)
router.get('/me', userController.getMe);

// Search for user by exact email match
router.get('/', emailSearchValidation, userController.searchByEmail);

// Profile picture routes
router.post('/profile/picture', uploadProfilePicture, handleUploadError, userController.uploadProfilePicture);
router.delete('/profile/picture', userController.deleteProfilePicture);

module.exports = router;
