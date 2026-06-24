const express = require('express');
const router = express.Router();
const approvalController = require('./approval.controller');
const workflowController = require('./workflow.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const upload = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

// --- Workflow configurations routes ---
router.get(
    '/workflows',
    authorize('approvals:read'),
    workflowController.getWorkflows
);
router.post(
    '/workflows',
    authorize('approvals:write'),
    workflowController.createWorkflow
);
router.put(
    '/workflows/:id',
    authorize('approvals:write'),
    workflowController.updateWorkflow
);
router.delete(
    '/workflows/:id',
    authorize('approvals:write'),
    workflowController.deleteWorkflow
);

// --- Approval requests routes ---
router.get('/', authorize('approvals:read'), approvalController.getApprovals);
router.get(
    '/:id',
    authorize('approvals:read'),
    approvalController.getApprovalDetails
);
router.post(
    '/',
    authorize('approvals:write'),
    approvalController.createApproval
);
router.put(
    '/:id',
    authorize('approvals:write'),
    approvalController.updateApproval
);

// --- Comments & attachments routes ---
router.post(
    '/:id/comments',
    authorize('approvals:write'),
    approvalController.addComment
);
router.post(
    '/:id/attachments',
    authorize('approvals:write'),
    upload.single('file'),
    approvalController.addAttachment
);
router.delete(
    '/attachments/:attachmentId',
    authorize('approvals:write'),
    approvalController.deleteAttachment
);

module.exports = router;
