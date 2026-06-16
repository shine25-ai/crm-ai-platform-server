const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time messaging and chat history logs APIs
 */

/**
 * @swagger
 * /api/chat/summary:
 *   get:
 *     summary: Retrieve chat summaries (unread message counts & last message previews) for all conversation threads
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat summaries retrieved successfully
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/chat/contacts:
 *   get:
 *     summary: Retrieve list of all active users as chat contacts (accessible to all roles)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat contacts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/contacts', chatController.getContacts);

router.get('/summary', chatController.getChatSummary);

/**
 * @swagger
 * /api/chat/messages/{otherUserId}:
 *   get:
 *     summary: Retrieve full conversational message history with a specific peer user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the conversation partner
 *     responses:
 *       200:
 *         description: Messages list retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/messages/:otherUserId', chatController.getMessages);

/**
 * @swagger
 * /api/chat/mark-read/{senderId}:
 *   post:
 *     summary: Mark all unread messages received from a specific user as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: senderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the sender whose messages are read
 *     responses:
 *       200:
 *         description: Messages marked read successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/mark-read/:senderId', chatController.markRead);

module.exports = router;
