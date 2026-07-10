const express = require('express');
const router = express.Router();
const issueController = require('./issue.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('tasks:read'), issueController.getIssues);
router.post('/', authorize('tasks:write'), issueController.createIssue);
router.get(
    '/dashboard',
    authorize('tasks:read'),
    issueController.getIssueDashboard
);
router.get(
    '/reports',
    authorize('tasks:read'),
    issueController.getIssueReports
);
router.post(
    '/escalate',
    authorize('tasks:write'),
    issueController.escalateIssues
);
router.get('/:id', authorize('tasks:read'), issueController.getIssueById);
router.put('/:id', authorize('tasks:write'), issueController.updateIssue);
router.post(
    '/:id/comments',
    authorize('tasks:read'),
    issueController.addComment
);

module.exports = router;
