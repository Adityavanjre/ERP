const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    let { email, password } = req.body;

    // Normalize inputs
    if (email) email = email.trim().toLowerCase();
    if (password) password = password.trim();

    const eventId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    console.log(`[AUDIT] [${eventId}] EVENT: LOGIN_ATTEMPT`);

    const user = await User.findOne({ email });

    if (!user) {
        console.log(`[AUDIT] [${eventId}] EVENT: LOGIN_FAILED | REASON: USER_NOT_FOUND`);
        res.status(401);
        throw new Error('Invalid email or password');
    }

    const isMatch = await user.matchPassword(password);
    // Credential validation internal result not logged

    if (isMatch) {
        console.log(`[AUDIT] [${eventId}] EVENT: LOGIN_SUCCESS | USER_ID: ${user._id}`);

        const token = generateToken(user._id);

        // Set HttpOnly secure cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            // token excluded from body for security
        });
    } else {
        console.log(`[AUDIT] [${eventId}] EVENT: LOGIN_FAILED | REASON: CREDENTIALS_MISMATCH`);
        res.status(401);
        throw new Error('Invalid email or password');
    }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        const token = generateToken(user._id);

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
};

const getUsers = async (req, res) => {
    const users = await User.find({}).select('-password');
    res.json(users);
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@klypso.agency').trim().toLowerCase();
        if (user.email === adminEmail) {
            res.status(400);
            throw new Error('Cannot delete system administrator');
        }
        await User.deleteOne({ _id: user._id });
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@klypso.agency').trim().toLowerCase();
        if (user.email === adminEmail) {
            res.status(400);
            throw new Error('Cannot modify system administrator role');
        }
        user.isAdmin = req.body.isAdmin;
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Private/Admin
const updateUserPassword = async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@klypso.agency').trim().toLowerCase();
        if (user.email === adminEmail) {
            res.status(400);
            throw new Error('Cannot arbitrarily change root administrator password from dashboard');
        }

        user.password = req.body.password;

        // The pre-save middleware in the User model will automatically hash the password
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Private
const logoutUser = async (req, res) => {
    res.cookie('auth_token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { authUser, registerUser, getUsers, deleteUser, updateUserRole, updateUserPassword, logoutUser };
