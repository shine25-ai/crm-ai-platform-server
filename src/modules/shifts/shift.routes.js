const express = require('express');
const shiftController = require('./shift.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

const router = express.Router();
router.use(authMiddleware);

router.get(
    '/my-schedule',
    authorize('shifts:read', 'attendance:read'),
    shiftController.mySchedule
);
router.get(
    '/employee/:employeeId/schedule',
    authorize('shifts:read'),
    shiftController.employeeSchedule
);
router.get(
    '/assignments',
    authorize('shifts:read'),
    shiftController.listAssignments
);
router.post(
    '/assignments',
    authorize('shifts:write'),
    shiftController.createAssignment
);
router.put(
    '/assignments/:id',
    authorize('shifts:write'),
    shiftController.updateAssignment
);
router.delete(
    '/assignments/:id',
    authorize('shifts:delete'),
    shiftController.removeAssignment
);
router.get('/', authorize('shifts:read'), shiftController.list);
router.post('/', authorize('shifts:write'), shiftController.create);
router.put('/:id', authorize('shifts:write'), shiftController.update);
router.delete('/:id', authorize('shifts:delete'), shiftController.remove);

module.exports = router;
