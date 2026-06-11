const express = require('express');
const router = express.Router();
const permissionController = require('./permission.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: System permissions master lookup APIs
 */

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get all system permissions master list
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 */
router.get('/', permissionController.getPermissions);

module.exports = router;
