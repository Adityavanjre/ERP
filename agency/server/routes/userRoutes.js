const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUsers, deleteUser, updateUserRole, updateUserPassword, logoutUser } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Recovery routes removed from HTTP surface. Use CLI scripts for break-glass recovery.

// User management routes
router.route('/')
    .get(protect, admin, getUsers)
    .post(registerUser);

router.route('/:id')
    .delete(protect, admin, deleteUser);

router.route('/:id/role')
    .put(protect, admin, updateUserRole);

router.route('/:id/password')
    .put(protect, admin, updateUserPassword);

router.post('/login', authUser);
router.post('/logout', protect, logoutUser);

module.exports = router;
