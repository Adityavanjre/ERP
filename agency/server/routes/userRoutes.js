const express = require('express');
const router = express.Router();
const { authUser, registerUser } = require('../controllers/userController');
const { restoreAdmin, diagnostic } = require('../controllers/setupController');

// Recovery route
router.get('/setup/restore-admin', restoreAdmin);
router.get('/setup/diagnostic', diagnostic);

// router.route('/').post(registerUser); // Keep registration disabled for public unless needed
router.post('/login', authUser);

module.exports = router;
