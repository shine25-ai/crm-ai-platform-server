const EmployeeDocument = require('./employeeDocument.model');
const fs = require('fs');
const path = require('path');
const ApiResponse = require('../../shared/utils/response');
const AppError = require('../../shared/utils/appError');

const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }
        const { employeeId, documentType } = req.body;
        if (!employeeId || !documentType) {
            // Remove uploaded file if validation fails
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            throw new AppError('employeeId and documentType are required', 400);
        }

        const doc = await EmployeeDocument.create({
            employeeId,
            documentType,
            fileName: req.file.originalname,
            filePath: `/uploads/documents/${req.file.filename}`,
            uploadedBy: req.user.userId
        });

        return ApiResponse.success(
            res,
            'Document uploaded successfully',
            doc,
            201
        );
    } catch (error) {
        // Remove uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

const getEmployeeDocuments = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
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
        const doc = await EmployeeDocument.findById(req.params.id);
        if (!doc) {
            throw new AppError('Document not found', 404);
        }

        const physicalPath = path.join(__dirname, '../../../', doc.filePath);
        if (fs.existsSync(physicalPath)) {
            fs.unlinkSync(physicalPath);
        }

        await EmployeeDocument.findByIdAndDelete(req.params.id);
        return ApiResponse.success(res, 'Document deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadDocument,
    getEmployeeDocuments,
    deleteDocument
};
