const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
    console.log("Uplink Initialized. Checking Environment...");

    if (!process.env.MONGO_URI) {
        console.error("CRITICAL: MONGO_URI is missing from environment variables!");
    }

    // 1. Try to connect to persistent MongoDB
    try {
        const sanitizedUri = process.env.MONGO_URI
            ? process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@')
            : 'MISSING';
        console.log(`Connecting to: ${sanitizedUri}`);

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log(`✅ MongoDB Connected (Persistent)`);

        await createAdminSafely();
        return;
    } catch (err) {
        console.error(`❌ Database Connection Failed: ${err.message}`);
        console.log('Attempting to continue without DB (API will remain limited)...');
    }
};

const createAdminSafely = async () => {
    try {
        const User = require('../models/User');
        const Project = require('../models/Project');
        const Blog = require('../models/Blog');
        const Job = require('../models/Job');

        const adminEmail = 'admin@klypso.agency';
        const userExists = await User.findOne({ email: adminEmail });

        if (!userExists) {
            console.log(`Seeding Admin User: ${adminEmail}...`);
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: 'password123',
                isAdmin: true,
            });
            console.log('✅ Admin user created successfully.');
        } else {
            console.log(`System Check: Admin user (${adminEmail}) already exists.`);
        }

        // Check if projects exist, if not seed them
        const projectCount = await Project.countDocuments();
        if (projectCount === 0) {
            const { projects, blogs, jobs } = require('../seeder.js');
            console.log('Seeding initial project, blog, and job data...');
            await Project.insertMany(projects);
            await Blog.insertMany(blogs);
            await Job.insertMany(jobs);
            console.log('Data successfully seeded to memory database.');
        }
    } catch (err) {
        console.error('Error seeding admin:', err.message);
    }
};

module.exports = connectDB;
