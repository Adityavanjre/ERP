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

// @desc    Diagnostic check
// @route   GET /api/users/setup/diagnostic
const diagnostic = async (req, res) => {
    const adminEmail = 'admin@klypso.agency';
    const user = await User.findOne({ email: adminEmail });

    res.json({
        time: new Date().toISOString(),
        database: require('mongoose').connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        admin_exists: !!user,
        admin_data: user ? {
            email: user.email,
            isAdmin: user.isAdmin,
            has_password: !!user.password
        } : null,
        env: {
            node_env: process.env.NODE_ENV,
            has_mongo_uri: !!process.env.MONGO_URI,
            port: process.env.PORT
        }
    });
};

module.exports = { restoreAdmin, diagnostic };
