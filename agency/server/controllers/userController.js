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

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });
    } else {
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
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
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
        if (user.email === 'admin@klypso.agency') {
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
        if (user.email === 'admin@klypso.agency') {
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
        if (user.email === 'admin@klypso.agency') {
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

module.exports = { authUser, registerUser, getUsers, deleteUser, updateUserRole, updateUserPassword };
