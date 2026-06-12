const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification center APIs
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Retrieve current user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/read/{id}:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *       404:
 *         description: Notification not found
 */
router.patch('/read/:id', notificationController.markNotificationAsRead);

module.exports = router;
