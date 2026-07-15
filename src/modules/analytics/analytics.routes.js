const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get(
    '/dashboard-summary',
    authorize('dashboard:view', 'reports:read'),
    analyticsController.getDashboardSummary
);

router.get(
    '/sales',
    authorize('reports:read', 'sales:read'),
    analyticsController.getSalesAnalytics
);

router.get(
    '/modules',
    authorize('reports:read'),
    analyticsController.getModulesAnalytics
);

module.exports = router;
