const express = require('express');
const router = express.Router();
const resourcePlanningController = require('./resourcePlanning.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get(
    '/',
    authorize('employees:read'),
    resourcePlanningController.getResourcesWorkload
);
router.get(
    '/allocations',
    authorize('employees:read'),
    resourcePlanningController.getAllocations
);
router.post(
    '/allocations',
    authorize('employees:write'),
    resourcePlanningController.createAllocation
);
router.put(
    '/allocations/:id',
    authorize('employees:write'),
    resourcePlanningController.updateAllocation
);
router.delete(
    '/allocations/:id',
    authorize('employees:write'),
    resourcePlanningController.deleteAllocation
);
router.get(
    '/calendar',
    authorize('employees:read'),
    resourcePlanningController.getCalendarView
);

module.exports = router;
