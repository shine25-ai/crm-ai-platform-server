const express = require('express');
const router = express.Router();
const approvalController = require('./approval.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('approvals:read'), approvalController.getApprovals);
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

module.exports = router;
