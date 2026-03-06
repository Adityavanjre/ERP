const User = require('../models/User');

// @desc    Setup admin user
// @route   GET /api/users/setup/restore-admin
// @access  Public (Temporal)
const restoreAdmin = async (req, res) => {
    const email = (process.env.ADMIN_EMAIL || 'admin@klypso.agency').trim().toLowerCase();
    const adminPassword = (process.env.ADMIN_PASSWORD || 'password123').trim();

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
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@klypso.agency').trim().toLowerCase();
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
        admin_data: user ? {
            email: user.email,
            isAdmin: user.isAdmin,
            has_password_hash: !!user.password,
            db_hash_start: user.password ? user.password.substring(0, 7) + '...' : null,
            env_matches_db_hash: envMatchesHash
        } : null,
        env: {
            has_mongo_uri: !!process.env.MONGO_URI,
            admin_pwd_provided: !!process.env.ADMIN_PASSWORD,
            admin_pwd_raw_length: process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.length : 0,
            admin_pwd_trimmed_length: envPass ? envPass.length : 0,
        }
    });
};

module.exports = { restoreAdmin, diagnostic };
