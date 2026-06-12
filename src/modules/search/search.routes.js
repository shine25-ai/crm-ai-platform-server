const express = require('express');
const router = express.Router();
const Employee = require('../employees/employee.model');
const User = require('../users/user.model');
const Department = require('../departments/department.model');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const ApiResponse = require('../../shared/utils/response');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Global Search
 *   description: Universal searching across directory modules
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Performs universal search across Employees, Users, and Departments
 *     tags: [Global Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search completed successfully
 */
router.get('/', async (req, res, next) => {
    try {
        const query = req.query.q || '';
        if (!query) {
            return ApiResponse.success(res, 'Search query is empty', {
                employees: [],
                users: [],
                departments: []
            });
        }

        const regex = new RegExp(query, 'i');

        // Execute concurrent queries
        const [employees, users, departments] = await Promise.all([
            Employee.find({
                $or: [
                    { name: regex },
                    { employeeId: regex },
                    { designation: regex }
                ]
            })
                .populate('department', 'departmentName')
                .limit(10),
            User.find({
                $or: [{ name: regex }, { email: regex }]
            }).limit(10),
            Department.find({
                $or: [{ departmentName: regex }, { departmentCode: regex }]
            }).limit(10)
        ]);

        return ApiResponse.success(res, 'Search results compiled', {
            employees,
            users,
            departments
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
