const express = require('express');
const router = express.Router();
const { authUser, registerUser } = require('../controllers/userController');

// router.route('/').post(registerUser); // Keep registration disabled for public unless needed
router.post('/login', authUser);

module.exports = router;
