const express = require('express');
const router = express.Router();
const leaveController = require('./leave.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get(
    '/policies',
    authorize('leave:read', 'approvals:read'),
    leaveController.getPolicies
);
router.post(
    '/policies',
    authorize('leave:write', 'approvals:write'),
    leaveController.savePolicy
);
router.put(
    '/policies/:id',
    authorize('leave:write', 'approvals:write'),
    leaveController.savePolicy
);

router.post(
    '/preview',
    authorize('leave:read', 'approvals:write'),
    leaveController.previewLeave
);
router.get(
    '/balances',
    authorize('leave:read', 'approvals:read'),
    leaveController.getBalances
);
router.get(
    '/my-balances',
    authorize('leave:read', 'approvals:read'),
    leaveController.getMyBalances
);
router.post(
    '/balances/adjust',
    authorize('leave:write', 'approvals:write'),
    leaveController.adjustBalance
);
router.post(
    '/year-end/carry-forward',
    authorize('leave:write', 'approvals:write'),
    leaveController.runCarryForward
);

module.exports = router;
