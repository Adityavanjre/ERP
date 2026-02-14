const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed!'), false);
        }
    }
});

/**
 * @desc    Upload an image to Cloudinary
 * @route   POST /api/upload
 * @access  Private/Admin
 */
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer);

        res.status(200).json({
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Failed to upload image to cloud storage' });
    }
});

module.exports = router;
