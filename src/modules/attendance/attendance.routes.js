const express = require('express');
const router = express.Router();
const attendanceController = require('./attendance.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

// Protect all attendance routes
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance check-in/out and logging APIs
 */

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Log employee shift check-in
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - checkInTime
 *             properties:
 *               date:
 *                 type: string
 *                 description: Date of check-in (YYYY-MM-DD)
 *                 example: 2026-06-11
 *               checkInTime:
 *                 type: string
 *                 description: Time of check-in (HH:MM AM/PM)
 *                 example: 09:30 AM
 *     responses:
 *       201:
 *         description: Checked in successfully
 *       400:
 *         description: Already checked in or missing required fields
 */
router.post(
    '/check-in',
    authorize('attendance:write', 'attendance:read'),
    attendanceController.checkIn
);

/**
 * @swagger
 * /api/attendance/check-out:
 *   post:
 *     summary: Log employee shift check-out
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - checkOutTime
 *             properties:
 *               date:
 *                 type: string
 *                 description: Date of check-out (YYYY-MM-DD)
 *                 example: 2026-06-11
 *               checkOutTime:
 *                 type: string
 *                 description: Time of check-out (HH:MM AM/PM)
 *                 example: 06:30 PM
 *     responses:
 *       200:
 *         description: Checked out successfully
 *       400:
 *         description: No active session found or missing required fields
 */
router.post(
    '/check-out',
    authorize('attendance:write', 'attendance:read'),
    attendanceController.checkOut
);
router.post(
    '/break-start',
    authorize('attendance:write', 'attendance:read'),
    attendanceController.breakStart
);
router.post(
    '/break-end',
    authorize('attendance:write', 'attendance:read'),
    attendanceController.breakEnd
);

/**
 * @swagger
 * /api/attendance/my-logs:
 *   get:
 *     summary: Retrieve attendance logs for the logged-in employee
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance logs retrieved successfully
 *       400:
 *         description: Could not resolve a valid Employee profile
 */
router.get(
    '/my-logs',
    authorize('attendance:read'),
    attendanceController.getMyLogs
);
router.get(
    '/history',
    authorize('attendance:read'),
    attendanceController.getHistory
);
router.get(
    '/monthly-report',
    authorize('attendance:read'),
    attendanceController.getMonthlyReport
);

module.exports = router;
