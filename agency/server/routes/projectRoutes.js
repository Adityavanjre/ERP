const express = require('express');
const router = express.Router();
const {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
} = require('../controllers/projectController');

const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getProjects)
    .post(protect, admin, createProject);

router.route('/:id')
    .get(getProjectById)
    .put(protect, admin, updateProject)
    .delete(protect, admin, deleteProject);

module.exports = router;
