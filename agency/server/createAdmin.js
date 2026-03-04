const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI.replace('localhost', '127.0.0.1'));
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const createAdmin = async () => {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error('SEC-020: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in environment variables.');
        process.exit(1);
    }

    try {
        await connectDB();

        // Check if admin exists
        const userExists = await User.findOne({ email: adminEmail });

        if (userExists) {
            console.log(`Admin user (${adminEmail}) already exists`);
            process.exit();
        }

        const user = await User.create({
            name: 'Admin User',
            email: adminEmail,
            password: adminPassword, // Will be hashed by pre-save hook
            isAdmin: true,
        });

        console.log(`Admin user (${adminEmail}) created successfully`);
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

createAdmin();
