const express = require('express');
const router = express.Router();
const departmentController = require('./department.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Corporate Departments configuration APIs
 */

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: Retrieve list of all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departments retrieved successfully
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - departmentName
 *               - departmentHead
 *             properties:
 *               departmentName:
 *                 type: string
 *                 example: Sales Department
 *               departmentHead:
 *                 type: string
 *                 example: Rajesh Kumar
 *     responses:
 *       201:
 *         description: Department created successfully
 */
router.get(
    '/',
    authorize('departments:read'),
    departmentController.getDepartments
);
router.post(
    '/',
    authorize('departments:write'),
    departmentController.createDepartment
);

/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     summary: Update an existing department details or status
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               departmentName:
 *                 type: string
 *               departmentHead:
 *                 type: string
 *               employeeCount:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Department updated successfully
 *   delete:
 *     summary: Remove/Delete a department configuration
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 */
router.put(
    '/:id',
    authorize('departments:write'),
    departmentController.updateDepartment
);
router.delete(
    '/:id',
    authorize('departments:delete'),
    departmentController.deleteDepartment
);

module.exports = router;
