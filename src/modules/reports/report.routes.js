const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get(
    '/sales',
    authorize('sales:read', 'reports:read'),
    reportController.getSalesReport
);
router.get(
    '/leads',
    authorize('leads:read', 'reports:read'),
    reportController.getLeadsReport
);
router.get(
    '/attendance',
    authorize('attendance:read', 'reports:read'),
    reportController.getAttendanceReport
);
router.get(
    '/tasks',
    authorize('tasks:read', 'reports:read'),
    reportController.getTasksReport
);
router.get(
    '/assets',
    authorize('assets:read', 'reports:read'),
    reportController.getAssetsReport
);
router.get(
    '/audit',
    authorize('settings:read', 'reports:read'),
    reportController.getAuditReport
);

module.exports = router;
