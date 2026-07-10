const express = require('express');
const router = express.Router();
const automationController = require('./automation.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('automations:read'), automationController.listJobs);

router.get('/:id', authorize('automations:read'), automationController.getJob);

router.post(
    '/',
    authorize('automations:write'),
    automationController.createJob
);

router.put(
    '/:id',
    authorize('automations:write'),
    automationController.updateJob
);

router.delete(
    '/:id',
    authorize('automations:write'),
    automationController.deleteJob
);

router.post(
    '/:id/trigger',
    authorize('automations:write'),
    automationController.triggerJob
);

module.exports = router;
