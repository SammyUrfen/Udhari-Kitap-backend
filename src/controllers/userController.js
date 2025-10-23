const User = require('../models/user');
const { deleteProfilePictureFromCloudinary } = require('../middleware/upload');

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
        profilePicture: user.profilePicture, // Cloudinary URL
        avatarUrl: user.avatarUrl // Keeping for backward compatibility
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload or update profile picture
 * POST /api/users/profile/picture
 * Requires: Authorization header, multipart/form-data with 'profilePicture' field
 * Accepts: JPEG, PNG, WebP up to 5MB (automatically compressed to ~400x400 and under 1MB)
 */
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a profile picture file'
      });
    }

    console.log('📸 Uploaded file info:', {
      filename: req.file.filename,
      path: req.file.path,
      secure_url: req.file.secure_url,
      public_id: req.file.public_id
    });

    const user = await User.findById(req.user._id);

    if (!user) {
      // Clean up uploaded file if user not found (Cloudinary will handle this)
      if (req.file.public_id) {
        await deleteProfilePictureFromCloudinary(req.file.public_id);
      }
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Delete old profile picture from Cloudinary if exists
    if (user.profilePicturePublicId) {
      await deleteProfilePictureFromCloudinary(user.profilePicturePublicId);
    }

    // Update user with new profile picture (Cloudinary URLs and public_id)
    user.profilePicture = req.file.secure_url || req.file.url || req.file.path; // Cloudinary HTTPS URL
    user.profilePicturePublicId = req.file.public_id || req.file.filename; // For deletion later
    
    console.log('💾 Saving user with profilePicture:', user.profilePicture);
    
    await user.save();

    console.log('✅ User saved, profilePicture in DB:', user.profilePicture);

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    // Clean up uploaded file on error
    if (req.file && req.file.public_id) {
      await deleteProfilePictureFromCloudinary(req.file.public_id);
    }
    next(err);
  }
};

/**
 * Delete profile picture
 * DELETE /api/users/profile/picture
 * Requires: Authorization header
 */
exports.deleteProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    if (!user.profilePicture) {
      return res.status(400).json({
        error: 'No profile picture',
        message: 'You do not have a profile picture to delete'
      });
    }

    // Delete from Cloudinary
    if (user.profilePicturePublicId) {
      await deleteProfilePictureFromCloudinary(user.profilePicturePublicId);
    }

    // Remove from database
    user.profilePicture = null;
    user.profilePicturePublicId = null;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture deleted successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: null
      }
    });
  } catch (err) {
    next(err);
  }
};
