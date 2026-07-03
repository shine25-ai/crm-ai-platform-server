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
        const query = {};
        if (req.query.search) {
            const regex = new RegExp(req.query.search, 'i');
            query.$or = [
                { module: regex },
                { action: regex },
                { ipAddress: regex }
            ];
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLog.countDocuments(query)
        ]);

        return ApiResponse.success(res, 'Audit logs retrieved successfully', {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
