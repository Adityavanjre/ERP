const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('express-async-errors');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

app.set('trust proxy', 1);

// Immediate Request Logger
app.use((req, res, next) => {
    console.log(`>>> [CORE LOG] ${req.method} ${req.url}`);
    next();
});

process.on('uncaughtException', (err) => {
    console.error('--- CRITICAL UNCAUGHT EXCEPTION ---');
    console.error(err);
});

app.get('/', (req, res) => {
    res.send('Klypso API is running...');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'up',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000', 'https://klypso.in', 'https://www.klypso.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use(limiter);

process.on('unhandledRejection', (reason, promise) => {
    console.error('--- CRITICAL UNHANDLED REJECTION ---');
    console.error('Promise:', promise, 'Reason:', reason);
});

// Routes
const enquiryRoutes = require('./routes/enquiryRoutes');
const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const jobRoutes = require('./routes/jobRoutes');
const uploadRoutes = require('./routes/uploadRoutes');


const { notFound, errorHandler } = require('./middleware/errorMiddleware');

app.use('/api/enquiries', enquiryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

// Database connection
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- KLYPSO SYSTEM ONLINE ---`);
    console.log(`Port: ${PORT}`);

    // Connect to DB using helper
    connectDB();
});

// Configure server timeouts for Render/Load Balancer stability
server.keepAliveTimeout = 120 * 1000; // 120 seconds
server.headersTimeout = 125 * 1000; // 125 seconds

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
});
