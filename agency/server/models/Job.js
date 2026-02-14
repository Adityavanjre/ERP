const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
    },
    type: {
        type: String, // e.g., 'Full-time', 'Contract', 'Part-time'
        required: true,
    },
    location: {
        type: String,
        required: true,
        default: 'Remote',
    },
    description: {
        type: String,
        required: true,
    },
    requirements: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Job', JobSchema);
