const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Users management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retrieve list of all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
 *   post:
 *     summary: Create/register a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: Priya Sharma
 *               email:
 *                 type: string
 *                 example: priya@crm.com
 *               mobile:
 *                 type: string
 *                 example: "+91 98765 43211"
 *               department:
 *                 type: string
 *                 example: Marketing Department
 *               role:
 *                 type: string
 *                 example: Marketing Executive
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.get('/', authorize('users:read'), userController.getUsers);
router.post('/', authorize('users:write'), userController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update an existing user's information or status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               mobile:
 *                 type: string
 *               department:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: User updated successfully
 *   delete:
 *     summary: Delete a user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.put('/:id', authorize('users:write'), userController.updateUser);
router.delete('/:id', authorize('users:delete'), userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   post:
 *     summary: Request/Trigger password reset link for user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 */
router.post(
    '/:id/reset-password',
    authorize('users:write'),
    userController.resetPassword
);

module.exports = router;
