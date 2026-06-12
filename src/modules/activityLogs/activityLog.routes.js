const express = require('express');
const router = express.Router();
const activityLogController = require('./activityLog.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);
router.get(
    '/',
    authorize('activity:read', 'settings:read'),
    activityLogController.getActivityLogs
);

module.exports = router;
