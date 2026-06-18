const EmployeeDocument = require('./employeeDocument.model');
const fs = require('fs');
const path = require('path');
const ApiResponse = require('../../shared/utils/response');
const AppError = require('../../shared/utils/appError');
const {
    uploadEmployeeDocumentToS3,
    deleteFileFromS3
} = require('../../shared/services/s3.service');

const uploadDocument = async (req, res, next) => {
    try {
        if (
            req.user.roleCode === 'EMPLOYEE' ||
            req.user.roleCode === 'Employee'
        ) {
            throw new AppError(
                'Forbidden: Employees are not allowed to upload documents',
                403
            );
        }

        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }
        const { employeeId, documentType } = req.body;
        if (!employeeId || !documentType) {
            throw new AppError('employeeId and documentType are required', 400);
        }

        const s3Url = await uploadEmployeeDocumentToS3(req.file, employeeId);

        const doc = await EmployeeDocument.create({
            employeeId,
            documentType,
            fileName: req.file.originalname,
            filePath: s3Url,
            uploadedBy: req.user.userId
        });

        return ApiResponse.success(
            res,
            'Document uploaded successfully',
            doc,
            201
        );
    } catch (error) {
        next(error);
    }
};

const getEmployeeDocuments = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        if (
            req.user.roleCode === 'EMPLOYEE' ||
            req.user.roleCode === 'Employee'
        ) {
            if (String(req.user.employeeId) !== String(employeeId)) {
                throw new AppError(
                    "Forbidden: Access to another employee's documents is blocked.",
                    403
                );
            }
        }

        const docs = await EmployeeDocument.find({ employeeId }).populate(
            'uploadedBy',
            'name'
        );
        return ApiResponse.success(
            res,
            'Documents retrieved successfully',
            docs
        );
    } catch (error) {
        next(error);
    }
};

const deleteDocument = async (req, res, next) => {
    try {
        if (
            req.user.roleCode === 'EMPLOYEE' ||
            req.user.roleCode === 'Employee'
        ) {
            throw new AppError(
                'Forbidden: Employees are not allowed to delete documents',
                403
            );
        }

        const doc = await EmployeeDocument.findById(req.params.id);
        if (!doc) {
            throw new AppError('Document not found', 404);
        }

        if (doc.filePath.startsWith('http')) {
            await deleteFileFromS3(doc.filePath);
        } else {
            const physicalPath = path.join(
                __dirname,
                '../../../',
                doc.filePath
            );
            if (fs.existsSync(physicalPath)) {
                fs.unlinkSync(physicalPath);
            }
        }

        await EmployeeDocument.findByIdAndDelete(req.params.id);
        return ApiResponse.success(res, 'Document deleted successfully');
    } catch (error) {
        next(error);
    }
};

const downloadDocument = async (req, res, next) => {
    try {
        const doc = await EmployeeDocument.findById(req.params.id);
        if (!doc) {
            throw new AppError('Document not found', 404);
        }

        if (
            req.user.roleCode === 'EMPLOYEE' ||
            req.user.roleCode === 'Employee'
        ) {
            if (String(doc.employeeId) !== String(req.user.employeeId)) {
                throw new AppError(
                    "Forbidden: Access to another employee's document is blocked.",
                    403
                );
            }
        }

        if (doc.filePath.startsWith('http')) {
            return res.redirect(doc.filePath);
        }

        const physicalPath = path.join(__dirname, '../../../', doc.filePath);
        if (!fs.existsSync(physicalPath)) {
            throw new AppError('File not found on server', 404);
        }

        return res.download(physicalPath, doc.fileName);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadDocument,
    getEmployeeDocuments,
    deleteDocument,
    downloadDocument
};
