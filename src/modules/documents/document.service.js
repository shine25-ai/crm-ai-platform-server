const Document = require('./document.model');
const Project = require('../projects/project.model');
const Customer = require('../customers/customer.model');
const {
    uploadGenericDocumentToS3,
    deleteFileFromS3
} = require('../../shared/services/s3.service');
const AppError = require('../../shared/utils/appError');

const uploadDocument = async (file, data, userId) => {
    if (!file) throw new AppError('No file uploaded', 400);

    const {
        title,
        category,
        relatedModule,
        relatedId,
        accessLevel = 'Employee'
    } = data;
    if (!title || !category || !relatedModule || !relatedId) {
        throw new AppError(
            'title, category, relatedModule, and relatedId are required fields.',
            400
        );
    }

    // Upload to S3
    const s3Url = await uploadGenericDocumentToS3(
        file,
        relatedModule.toLowerCase()
    );

    const doc = await Document.create({
        title,
        category,
        relatedModule,
        relatedId,
        fileName: file.originalname,
        filePath: s3Url,
        fileSize: file.size,
        mimeType: file.mimetype,
        version: 1,
        versions: [
            {
                versionNumber: 1,
                filePath: s3Url,
                fileName: file.originalname,
                uploadedBy: userId,
                uploadedDate: new Date()
            }
        ],
        accessLevel,
        uploadedBy: userId,
        auditHistory: [
            {
                action: 'Uploaded',
                performedBy: userId,
                timestamp: new Date(),
                details: `Document "${title}" version 1 uploaded.`
            }
        ]
    });

    // Also update project history if related to a project
    if (relatedModule === 'Project') {
        const project = await Project.findById(relatedId);
        if (project) {
            project.activityHistory.push({
                action: 'Document Uploaded',
                details: `Document "${title}" was uploaded to the project.`,
                performedBy: userId
            });
            await project.save();
        }
    }

    return doc;
};

const addVersion = async (id, file, userId) => {
    if (!file) throw new AppError('No file uploaded', 400);

    const doc = await Document.findById(id);
    if (!doc) throw new AppError('Document not found', 404);

    const nextVer = doc.version + 1;
    const s3Url = await uploadGenericDocumentToS3(
        file,
        doc.relatedModule.toLowerCase()
    );

    doc.version = nextVer;
    doc.filePath = s3Url;
    doc.fileName = file.originalname;
    doc.fileSize = file.size;
    doc.mimeType = file.mimetype;
    doc.versions.push({
        versionNumber: nextVer,
        filePath: s3Url,
        fileName: file.originalname,
        uploadedBy: userId,
        uploadedDate: new Date()
    });

    doc.auditHistory.push({
        action: 'Version Added',
        performedBy: userId,
        timestamp: new Date(),
        details: `Uploaded version ${nextVer}.`
    });

    await doc.save();

    if (doc.relatedModule === 'Project') {
        const project = await Project.findById(doc.relatedId);
        if (project) {
            project.activityHistory.push({
                action: 'Document Version Added',
                details: `Uploaded version ${nextVer} of document "${doc.title}".`,
                performedBy: userId
            });
            await project.save();
        }
    }

    return doc;
};

const getDocuments = async (filters = {}, roleCode = 'Employee', userId) => {
    const query = { isDeleted: false };
    const normRole = String(roleCode).toUpperCase();

    // Role-based Access Control
    if (normRole === 'EMPLOYEE') {
        query.$or = [
            { accessLevel: { $in: ['Public', 'Employee'] } },
            { uploadedBy: userId }
        ];
    } else if (normRole === 'MANAGER') {
        query.$or = [
            { accessLevel: { $in: ['Public', 'Employee', 'Manager'] } },
            { uploadedBy: userId }
        ];
    } // Admins can see all accessLevels (Admin level)

    if (filters.relatedModule) query.relatedModule = filters.relatedModule;
    if (filters.relatedId) query.relatedId = filters.relatedId;
    if (filters.category) query.category = filters.category;
    if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' };
    }

    return Document.find(query)
        .populate('uploadedBy', 'name email')
        .sort({ updatedAt: -1 });
};

const deleteDocument = async (id, userId) => {
    const doc = await Document.findById(id);
    if (!doc) throw new AppError('Document not found', 404);

    doc.isDeleted = true;
    doc.auditHistory.push({
        action: 'Deleted',
        performedBy: userId,
        timestamp: new Date(),
        details: 'Document moved to trash.'
    });
    await doc.save();

    if (doc.relatedModule === 'Project') {
        const project = await Project.findById(doc.relatedId);
        if (project) {
            project.activityHistory.push({
                action: 'Document Deleted',
                details: `Document "${doc.title}" was deleted from the project.`,
                performedBy: userId
            });
            await project.save();
        }
    }

    return { success: true };
};

const downloadDocument = async (id, userId) => {
    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) throw new AppError('Document not found', 404);

    doc.auditHistory.push({
        action: 'Downloaded',
        performedBy: userId,
        timestamp: new Date(),
        details: 'File downloaded.'
    });
    await doc.save();

    return doc;
};

module.exports = {
    uploadDocument,
    addVersion,
    getDocuments,
    deleteDocument,
    downloadDocument
};
