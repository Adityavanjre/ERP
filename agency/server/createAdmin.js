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
    try {
        await connectDB();

        // Check if admin exists
        const userExists = await User.findOne({ email: 'admin@klypso.agency' });

        if (userExists) {
            console.log('Admin user already exists');
            process.exit();
        }

        const user = await User.create({
            name: 'Admin User',
            email: 'admin@klypso.agency',
            password: 'password123', // Will be hashed by pre-save hook
            isAdmin: true,
        });

        console.log('Admin user created');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

createAdmin();
