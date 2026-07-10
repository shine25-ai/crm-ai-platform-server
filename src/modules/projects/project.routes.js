const express = require('express');
const router = express.Router();
const projectController = require('./project.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('projects:read'), projectController.getProjects);
router.post('/', authorize('projects:write'), projectController.createProject);
router.get(
    '/:id',
    authorize('projects:read'),
    projectController.getProjectById
);
router.put(
    '/:id',
    authorize('projects:write'),
    projectController.updateProject
);
router.put(
    '/:id/archive',
    authorize('projects:write'),
    projectController.toggleArchive
);
router.get(
    '/:id/dashboard',
    authorize('projects:read'),
    projectController.getProjectDashboard
);

// Milestones
router.post(
    '/:id/milestones',
    authorize('projects:write'),
    projectController.addMilestone
);
router.put(
    '/:id/milestones/:milestoneId',
    authorize('projects:write'),
    projectController.updateMilestone
);
router.delete(
    '/:id/milestones/:milestoneId',
    authorize('projects:write'),
    projectController.deleteMilestone
);

module.exports = router;
