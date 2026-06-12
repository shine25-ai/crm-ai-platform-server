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
 *   post:
 *     summary: Create a new system permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionCode
 *               - permissionName
 *               - module
 *             properties:
 *               permissionCode:
 *                 type: string
 *                 example: employee.create
 *               permissionName:
 *                 type: string
 *                 example: Create Employees
 *               module:
 *                 type: string
 *                 example: Employees
 *               description:
 *                 type: string
 *                 example: Allows creating new employee records in directory
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *     responses:
 *       201:
 *         description: Permission created successfully
 */
router.get('/', permissionController.getPermissions);
router.post('/', permissionController.createPermission);

/**
 * @swagger
 * /api/permissions/{id}:
 *   get:
 *     summary: Get a specific permission by MongoDB ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The permission ID
 *     responses:
 *       200:
 *         description: Permission details retrieved successfully
 *       404:
 *         description: Permission not found
 *   put:
 *     summary: Update an existing permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The permission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissionCode:
 *                 type: string
 *               permissionName:
 *                 type: string
 *               module:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       404:
 *         description: Permission not found
 *   delete:
 *     summary: Delete a specific permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The permission ID
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       404:
 *         description: Permission not found
 */
router.get('/:id', permissionController.getPermissionById);
router.put('/:id', permissionController.updatePermission);
router.delete('/:id', permissionController.deletePermission);

module.exports = router;
