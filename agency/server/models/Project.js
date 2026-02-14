const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    fullDescription: {
        type: String,
    },
    image: {
        type: String,
        required: true,
    },
    categories: {
        type: [String],
        default: ['General'],
    },
    challenge: {
        type: String,
    },
    solution: {
        type: String,
    },
    technologies: {
        type: [String],
        default: [],
    },
    impact: {
        type: String,
    },
    testimonial: {
        quote: String,
        author: String,
        role: String,
    },
    gallery: {
        type: [String],
        default: [],
    },
    services: {
        type: [String],
        default: [],
    },
    link: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Project', ProjectSchema);
