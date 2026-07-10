const express = require('express');
const router = express.Router();
const timesheetController = require('./timesheet.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get(
    '/',
    authorize('attendance:read'),
    timesheetController.getTimesheets
);
router.post(
    '/',
    authorize('attendance:read'),
    timesheetController.createTimesheet
);
router.put(
    '/:id',
    authorize('attendance:read'),
    timesheetController.updateTimesheet
);
router.put(
    '/:id/submit',
    authorize('attendance:read'),
    timesheetController.submitTimesheet
);
router.put(
    '/:id/approve',
    authorize('attendance:write'),
    timesheetController.reviewTimesheet
);
router.get(
    '/reports',
    authorize('attendance:read'),
    timesheetController.getTimesheetReports
);

module.exports = router;
