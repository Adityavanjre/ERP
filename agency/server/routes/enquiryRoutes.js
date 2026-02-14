const express = require('express');
const router = express.Router();
const { createEnquiry, getEnquiries } = require('../controllers/enquiryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(createEnquiry)
    .get(protect, admin, getEnquiries);

router.route('/:id')
    .delete(protect, admin, require('../controllers/enquiryController').deleteEnquiry);

module.exports = router;
