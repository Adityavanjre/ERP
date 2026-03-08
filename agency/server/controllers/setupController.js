const User = require('../models/User');

// @desc    Setup admin user
// @route   GET /api/users/setup/restore-admin
// @access  Public (Temporal)
const restoreAdmin = async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: 'Diagnostic and recovery tools are disabled in production to protect system integrity.' });
    }
    if (!process.env.ADMIN_EMAIL) {
        throw new Error('SEC-020: ADMIN_EMAIL must be set in environment variables.');
    }
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD.trim();

    // Using upsert logic
    let user = await User.findOne({ email });

    if (user) {
        user.password = adminPassword;
        user.isAdmin = true;
        await user.save();
    } else {
        user = await User.create({
            name: 'System Administrator',
            email: email,
            password: adminPassword,
            isAdmin: true,
        });
    }

    res.json({
        status: 'SUCCESS',
        message: 'Agency Admin account restored. Password has been securely synced to environment configuration.',
        credentials: {
            email: email,
            password: '*** [REDACTED FOR SECURITY] ***'
        }
    });
};

// @desc    Diagnostic check
// @route   GET /api/users/setup/diagnostic
const diagnostic = async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: 'Diagnostic tools are disabled in production.' });
    }
    if (!process.env.ADMIN_EMAIL) {
        throw new Error('SEC-020: ADMIN_EMAIL must be set in environment variables.');
    }
    const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const user = await User.findOne({ email: adminEmail });

    let envMatchesHash = false;
    let envPass = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : null;

    if (user && user.password && envPass) {
        envMatchesHash = await require('bcryptjs').compare(envPass, user.password);
    }

    res.json({
        time: new Date().toISOString(),
        database: require('mongoose').connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        admin_exists: !!user,
        env: {
            has_mongo_uri: !!process.env.MONGO_URI,
            admin_pwd_provided: !!process.env.ADMIN_PASSWORD,
        }
    });
};

module.exports = { restoreAdmin, diagnostic };
