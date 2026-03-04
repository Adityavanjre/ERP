const mongoose = require('mongoose');
const path = require('path');
// Load .env from current directory or parent depending on where script is run
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        // Force IPv4 if needed, but relying on .env now
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to DB: ${error.message}`);
        process.exit(1);
    }
};

const createAdmin = async () => {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error('SEC-020: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in the .env file.');
        process.exit(1);
    }

    try {
        await connectDB();

        console.log(`Checking for existing admin user (${adminEmail})...`);
        const userExists = await User.findOne({ email: adminEmail });

        if (userExists) {
            console.log('Admin user already exists');
        } else {
            console.log('Creating admin user...');
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: adminPassword,
                isAdmin: true,
            });
            console.log('Admin user created successfully');
        }

        console.log('Script completed.');
        process.exit();
    } catch (error) {
        console.error(`Execution Error: ${error}`);
        process.exit(1);
    }
};

createAdmin();
