const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUsers, deleteUser, updateUserRole, updateUserPassword } = require('../controllers/userController');
const { restoreAdmin, diagnostic } = require('../controllers/setupController');
const { protect, admin } = require('../middleware/authMiddleware');

// Recovery route (Development only)
if (process.env.NODE_ENV !== 'production') {
    router.get('/setup/restore-admin', restoreAdmin);
    router.get('/setup/diagnostic', diagnostic);
}

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

module.exports = router;
