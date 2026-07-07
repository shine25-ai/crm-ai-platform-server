const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to the application
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@crm.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

router.get('/oauth/:provider/start', authController.startOAuthLogin);
router.get('/oauth/:provider/callback', authController.completeOAuthLogin);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT Token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Forgot Password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@crm.com
 *     responses:
 *       200:
 *         description: Reset password link sent
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset Password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/auth/verify-onboarding:
 *   get:
 *     summary: Verify an employee onboarding token
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The secure onboarding token from the email link
 *     responses:
 *       200:
 *         description: Token valid — returns employee preview (name, email, department)
 *       400:
 *         description: Token invalid or expired
 */
router.get('/verify-onboarding', authController.verifyOnboarding);

/**
 * @swagger
 * /api/auth/complete-onboarding:
 *   post:
 *     summary: Complete employee onboarding — sets password and personal info
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: The secure onboarding token
 *               password:
 *                 type: string
 *                 example: MySecure@123
 *               personalInfo:
 *                 type: object
 *                 properties:
 *                   dob:
 *                     type: string
 *                     example: 1995-06-15
 *                   gender:
 *                     type: string
 *                     example: Male
 *                   address:
 *                     type: string
 *                     example: 12 MG Road, Chennai
 *                   bloodGroup:
 *                     type: string
 *                     example: O+
 *                   emergencyContact:
 *                     type: string
 *                     example: "+91 98765 43210"
 *     responses:
 *       200:
 *         description: Onboarding complete — user account created
 *       400:
 *         description: Invalid token, expired, or already completed
 */
router.post('/complete-onboarding', authController.completeOnboarding);

module.exports = router;
