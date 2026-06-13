const express = require('express');
const router = express.Router();
const User = require('../users/user.model');
const Employee = require('../employees/employee.model');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const ApiResponse = require('../../shared/utils/response');
const AppError = require('../../shared/utils/appError');
const bcrypt = require('bcryptjs');
const profilePhotoUpload = require('../../shared/middleware/profilePhotoUpload.middleware');
const { uploadProfilePhotoToS3 } = require('../../shared/services/s3.service');

router.use(authMiddleware);

const findEmployeeForUser = async (
    userId,
    employeeId,
    populateDepartment = false
) => {
    let query = null;

    if (employeeId) {
        query = Employee.findById(employeeId);
    } else if (userId) {
        query = Employee.findOne({ userId });
    }

    if (!query) {
        return null;
    }

    if (populateDepartment) {
        query = query.populate('department');
    }

    return query;
};

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Logged-in user profile management APIs
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/', async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).populate('roleId');
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const employee = await findEmployeeForUser(
            user._id,
            user.employeeId,
            true
        );

        return ApiResponse.success(res, 'Profile retrieved successfully', {
            user,
            employee
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update profile info
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               mobile:
 *                 type: string
 *               profilePhoto:
 *                 type: string
 *               permanentAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/', async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const { name, mobile, profilePhoto, permanentAddress } = req.body;

        if (name !== undefined) user.name = name;
        if (mobile !== undefined) user.mobile = mobile;
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
        await user.save();

        const employee = await findEmployeeForUser(user._id, user.employeeId);
        if (employee) {
            if (name !== undefined) employee.name = name;
            if (mobile !== undefined) employee.mobile = mobile;
            if (profilePhoto !== undefined)
                employee.profilePhoto = profilePhoto;
            if (permanentAddress !== undefined) {
                employee.personalInfo = {
                    ...employee.personalInfo,
                    permanentAddress
                };
            }
            await employee.save();
        }

        return ApiResponse.success(res, 'Profile updated successfully', {
            user,
            employee
        });
    } catch (error) {
        next(error);
    }
});

router.post(
    '/photo',
    profilePhotoUpload.single('photo'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                throw new AppError('Profile photo is required', 400);
            }

            const user = await User.findById(req.user.userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            const employee = await findEmployeeForUser(
                user._id,
                user.employeeId
            );

            const profilePhoto = await uploadProfilePhotoToS3(
                req.file,
                req.user.userId
            );

            user.profilePhoto = profilePhoto;
            await user.save();

            if (employee) {
                employee.profilePhoto = profilePhoto;
                await employee.save();
            }

            return ApiResponse.success(
                res,
                'Profile photo uploaded successfully',
                {
                    profilePhoto
                }
            );
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @swagger
 * /api/profile/change-password:
 *   post:
 *     summary: Update user password
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Current password incorrect
 */
router.post('/change-password', async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            throw new AppError(
                'Current password and new password are required',
                400
            );
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new AppError('Current password is incorrect', 400);
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
