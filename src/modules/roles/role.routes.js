const express = require('express');
const router = express.Router();
const roleController = require('./role.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Roles and Permissions Management APIs
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleName
 *             properties:
 *               roleName:
 *                 type: string
 *                 example: Sales Executive
 *               description:
 *                 type: string
 *                 example: Handle customer sales calls
 *     responses:
 *       201:
 *         description: Role created successfully
 */
router.get('/', authorize('roles:read'), roleController.getRoles);
router.post('/', authorize('roles:write'), roleController.createRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update an existing role or permissions mapping
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleName:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["dashboard:view", "users:read"]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 */
router.put('/:id', authorize('roles:write'), roleController.updateRole);
router.delete('/:id', authorize('roles:delete'), roleController.deleteRole);

module.exports = router;
