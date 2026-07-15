const express = require('express');
const router = express.Router();
const workflowController = require('./workflow.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('workflows:read'), workflowController.listWorkflows);

router.get('/logs', authorize('workflows:read'), workflowController.listLogs);

router.get('/:id', authorize('workflows:read'), workflowController.getWorkflow);

router.post(
    '/',
    authorize('workflows:write'),
    workflowController.createWorkflow
);

router.put(
    '/:id',
    authorize('workflows:write'),
    workflowController.updateWorkflow
);

router.delete(
    '/:id',
    authorize('workflows:write'),
    workflowController.deleteWorkflow
);

module.exports = router;
