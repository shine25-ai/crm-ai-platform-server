const express = require('express');
const router = express.Router();
const AuditLog = require('./auditLog.model');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const ApiResponse = require('../../shared/utils/response');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: System auditing logs for security tracking
 */

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Retrieve system audit logs list
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get('/', async (req, res, next) => {
    try {
        const logs = await AuditLog.find({})
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(200);
        return ApiResponse.success(
            res,
            'Audit logs retrieved successfully',
            logs
        );
    } catch (error) {
        next(error);
    }
});

module.exports = router;
