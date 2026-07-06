const express = require('express');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const projectActivityController = require('./projectActivity.controller');

const router = express.Router();
router.use(authMiddleware);
router.get(
    '/',
    authorize('activity:read', 'customers:read'),
    projectActivityController.search
);

module.exports = router;
