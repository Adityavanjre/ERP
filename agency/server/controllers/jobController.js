const Job = require('../models/Job');

// @desc    Get all active jobs
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ isActive: { $ne: false } }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a job posting
// @route   POST /api/jobs
// @access  Private/Admin
const createJob = async (req, res) => {
    const { role, type, location, description, requirements } = req.body;

    try {
        const job = new Job({
            role,
            type,
            location,
            description,
            requirements,
            isActive: true,
        });

        const createdJob = await job.save();
        res.status(201).json(createdJob);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a job posting
// @route   PUT /api/jobs/:id
// @access  Private/Admin
const updateJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            Object.assign(job, req.body);
            const updatedJob = await job.save();
            res.json(updatedJob);
        } else {
            res.status(404).json({ message: 'Job posting not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a job posting
// @route   DELETE /api/jobs/:id
// @access  Private/Admin
const deleteJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            await job.deleteOne();
            res.json({ message: 'Job posting removed' });
        } else {
            res.status(404).json({ message: 'Job posting not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getJobs,
    createJob,
    updateJob,
    deleteJob,
};
