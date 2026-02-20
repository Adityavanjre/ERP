const User = require('../models/User');

// @desc    Setup admin user
// @route   GET /api/users/setup/restore-admin
// @access  Public (Temporal)
const restoreAdmin = async (req, res) => {
    const email = 'admin@klypso.agency';

    // Using upsert logic
    let user = await User.findOne({ email });

    if (user) {
        user.password = 'password123';
        user.isAdmin = true;
        await user.save();
    } else {
        user = await User.create({
            name: 'System Administrator',
            email: email,
            password: 'password123',
            isAdmin: true,
        });
    }

    res.json({
        status: 'SUCCESS',
        message: 'Agency Admin account restored.',
        credentials: {
            email: email,
            password: 'password123'
        }
    });
};

module.exports = { restoreAdmin };
