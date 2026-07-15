const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.post('/chat', authorize('ai:write'), aiController.chat);

router.post(
    '/lead-summary',
    authorize('ai:read'),
    aiController.generateLeadSummary
);

router.post(
    '/customer-summary',
    authorize('ai:read'),
    aiController.generateCustomerSummary
);

router.post(
    '/task-summary',
    authorize('ai:read'),
    aiController.generateTaskSummary
);

router.post(
    '/report-summary',
    authorize('ai:read'),
    aiController.generateReportSummary
);

router.post(
    '/followup-suggestions',
    authorize('ai:read'),
    aiController.generateFollowupSuggestions
);

router.get(
    '/conversations',
    authorize('ai:read'),
    aiController.listConversations
);

router.get(
    '/context',
    authorize('ai:read'),
    aiController.getConversationByContext
);

router.get('/history/:id', authorize('ai:read'), aiController.getConversation);

router.delete(
    '/history/:id',
    authorize('ai:write'),
    aiController.deleteConversation
);

module.exports = router;
