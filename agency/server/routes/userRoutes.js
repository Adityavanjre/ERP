const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUsers, deleteUser, updateUserRole } = require('../controllers/userController');
const { restoreAdmin, diagnostic } = require('../controllers/setupController');
const { protect, admin } = require('../middleware/authMiddleware');

// Recovery route
router.get('/setup/restore-admin', restoreAdmin);
router.get('/setup/diagnostic', diagnostic);

// User management routes
router.route('/')
    .get(protect, admin, getUsers)
    .post(registerUser);

router.route('/:id')
    .delete(protect, admin, deleteUser);

router.route('/:id/role')
    .put(protect, admin, updateUserRole);

router.post('/login', authUser);

module.exports = router;
