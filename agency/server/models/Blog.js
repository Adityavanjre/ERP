const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
        default: 'Team Klypso',
    },
    date: {
        type: String, // Storing as readable string for simplicity, or Date
        default: () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    category: {
        type: String,
        required: true,
        enum: ['Tech', 'Design', 'Marketing', 'Business', 'Agency', 'Culture', 'Architecture', 'Strategy', 'Insights', 'Engineering', 'Security', 'Web3', 'FinTech'],
    },
    image: {
        type: String,
        required: true,
    },
    excerpt: {
        type: String,
        required: true,
    },
    content: {
        type: String, // Full markdown or HTML content
        required: false,
    },
    readTime: {
        type: String, // e.g., "5 min read"
        default: '3 min read'
    },
    tags: [{
        type: String
    }],
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Blog', BlogSchema);
