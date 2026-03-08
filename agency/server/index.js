const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('express-async-errors');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

if (!process.env.ADMIN_PASSWORD) {
    console.error('FATAL ERROR: ADMIN_PASSWORD environment variable is missing.');
    process.exit(1);
}
const app = express();

app.use(cookieParser());


app.set('trust proxy', 1);

// Immediate Request Logger (Development Only)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        const cleanUrl = req.url.split('?')[0];
        console.log(`>>> [CORE LOG] ${req.method} ${cleanUrl}${req.url.includes('?') ? '?REDACTED' : ''}`);
    }
    next();
});

process.on('uncaughtException', (err) => {
    console.error('--- [FATAL] UNCAUGHT EXCEPTION ---');
    console.error(err.stack || err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('--- [FATAL] UNHANDLED REJECTION ---');
    console.error('Reason:', reason.stack || reason);
    process.exit(1);
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
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use(limiter);

// Unhandled Rejections are handled at the bottom of the file

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
// All process handlers moved to top of file
