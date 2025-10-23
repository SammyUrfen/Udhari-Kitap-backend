const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/**
 * Cloudinary Upload Middleware Configuration
 * Handles profile picture uploads with automatic compression and cloud storage
 */

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'udhari-kitap/profile-pictures',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face',
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      ],
      public_id: `user-${req.user._id}-${Date.now()}`
    };
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size (before compression)
    files: 1 // Only one file at a time
  }
});

/**
 * Middleware to handle profile picture upload
 * Use as: uploadProfilePicture.single('profilePicture')
 */
const uploadProfilePicture = upload.single('profilePicture');

/**
 * Error handling middleware for multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Profile picture must be smaller than 5MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one profile picture can be uploaded at a time'
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  } else if (err) {
    // Other errors (like file type validation)
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  next();
};

/**
 * Delete a profile picture from Cloudinary
 * @param {string} publicId - Cloudinary public_id of the image to delete
 * @returns {Promise<void>}
 */
const deleteProfilePictureFromCloudinary = async (publicId) => {
  if (!publicId) return;
  
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw error - log and continue
  }
};

module.exports = {
  uploadProfilePicture,
  handleUploadError,
  deleteProfilePictureFromCloudinary,
  cloudinary
};
