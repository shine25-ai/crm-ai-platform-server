const express = require('express');
const router = express.Router();
const employeeController = require('./employee.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Corporate Employees registration and profile details management APIs
 */

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Retrieve list of all employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *   post:
 *     summary: Register a new employee record
 *     tags: [Employees]
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
 *               - department
 *               - designation
 *               - mobile
 *             properties:
 *               name:
 *                 type: string
 *                 example: Priya Sharma
 *               department:
 *                 type: string
 *                 example: Marketing Department
 *               designation:
 *                 type: string
 *                 example: Marketing Director
 *               manager:
 *                 type: string
 *                 example: Arun Kumar
 *               mobile:
 *                 type: string
 *                 example: "+91 98765 43201"
 *               personalInfo:
 *                 type: object
 *                 properties:
 *                   dob:
 *                     type: string
 *                     example: 1990-09-21
 *                   gender:
 *                     type: string
 *                     example: Female
 *                   address:
 *                     type: string
 *                     example: 45 Green Meadows, Bangalore
 *                   bloodGroup:
 *                     type: string
 *                     example: A+
 *               employmentInfo:
 *                 type: object
 *                 properties:
 *                   joinDate:
 *                     type: string
 *                     example: 2021-03-15
 *                   employeeType:
 *                     type: string
 *                     example: Full-Time
 *                   salary:
 *                     type: string
 *                     example: "₹1,80,000 / month"
 *                   workLocation:
 *                     type: string
 *                     example: Bangalore Hub
 *     responses:
 *       201:
 *         description: Employee created successfully
 */
router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.get('/:id', employeeController.getEmployee);

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update an existing employee profile details, attendance, performance, documents, or status
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               department:
 *                 type: string
 *               designation:
 *                 type: string
 *               manager:
 *                 type: string
 *               mobile:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *               personalInfo:
 *                 type: object
 *               employmentInfo:
 *                 type: object
 *               attendance:
 *                 type: array
 *                 items:
 *                   type: object
 *               performance:
 *                 type: object
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *   delete:
 *     summary: Delete an employee record
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 */
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

/**
 * @swagger
 * /api/employees/{id}/resend-onboarding:
 *   post:
 *     summary: Resend onboarding invitation email to a pending employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The employee MongoDB ID
 *     responses:
 *       200:
 *         description: Onboarding invitation email resent successfully
 *       400:
 *         description: Employee has already completed onboarding
 *       404:
 *         description: Employee not found
 */
router.post('/:id/resend-onboarding', employeeController.resendOnboarding);

module.exports = router;
