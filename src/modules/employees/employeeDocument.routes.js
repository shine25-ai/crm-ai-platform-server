const express = require('express');
const router = express.Router();
const employeeDocumentController = require('./employeeDocument.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const uploadMiddleware = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Employee Documents
 *   description: Employee file upload and management APIs
 */

/**
 * @swagger
 * /api/employee-documents:
 *   post:
 *     summary: Upload a document for an employee
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - documentType
 *               - file
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: 6a2aae72218fcc7d45a57b0e
 *               documentType:
 *                 type: string
 *                 enum: [Resume, Offer Letter, PAN Card, Aadhaar Card, Driving License, Certificates, Passport, Other]
 *                 example: Resume
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: Invalid input or file missing
 */
router.post(
    '/',
    uploadMiddleware.single('file'),
    employeeDocumentController.uploadDocument
);

/**
 * @swagger
 * /api/employee-documents/{employeeId}:
 *   get:
 *     summary: Retrieve list of documents uploaded for a target employee
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The employee MongoDB ID
 *     responses:
 *       200:
 *         description: Employee documents retrieved successfully
 */
router.get('/:employeeId', employeeDocumentController.getEmployeeDocuments);

/**
 * @swagger
 * /api/employee-documents/delete/{id}:
 *   delete:
 *     summary: Delete a specific document by ID (and clear local file)
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
router.delete('/:id', employeeDocumentController.deleteDocument);

/**
 * @swagger
 * /api/employee-documents/download/{id}:
 *   get:
 *     summary: Download a specific document securely by ID
 *     tags: [Employee Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     responses:
 *       200:
 *         description: Document downloaded successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
router.get('/download/:id', employeeDocumentController.downloadDocument);

module.exports = router;
