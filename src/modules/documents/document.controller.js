const documentService = require('./document.service');
const ApiResponse = require('../../shared/utils/response');

const uploadDocument = async (req, res, next) => {
    try {
        const doc = await documentService.uploadDocument(
            req.file,
            req.body,
            req.user.userId
        );
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

const addVersion = async (req, res, next) => {
    try {
        const doc = await documentService.addVersion(
            req.params.id,
            req.file,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'New document version uploaded successfully',
            doc
        );
    } catch (error) {
        next(error);
    }
};

const getDocuments = async (req, res, next) => {
    try {
        const docs = await documentService.getDocuments(
            req.query,
            req.user.roleCode,
            req.user.userId
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
        const result = await documentService.deleteDocument(
            req.params.id,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Document deleted successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const downloadDocument = async (req, res, next) => {
    try {
        const doc = await documentService.downloadDocument(
            req.params.id,
            req.user.userId
        );
        // If it starts with http, redirect to the secure S3 URL, else trigger native Express download
        if (doc.filePath.startsWith('http')) {
            return res.redirect(doc.filePath);
        }
        return res.download(doc.filePath, doc.fileName);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadDocument,
    addVersion,
    getDocuments,
    deleteDocument,
    downloadDocument
};
