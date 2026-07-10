const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true
        },
        relatedModule: {
            type: String,
            enum: [
                'Project',
                'Customer',
                'Employee',
                'Invoice',
                'Task',
                'Issue'
            ],
            required: true
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        fileName: {
            type: String,
            required: true
        },
        filePath: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number
        },
        mimeType: {
            type: String
        },
        version: {
            type: Number,
            default: 1
        },
        versions: [
            {
                versionNumber: { type: Number },
                filePath: { type: String },
                fileName: { type: String },
                uploadedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                uploadedDate: { type: Date, default: Date.now }
            }
        ],
        accessLevel: {
            type: String,
            enum: ['Public', 'Employee', 'Manager', 'Admin'],
            default: 'Employee'
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        auditHistory: [
            {
                action: { type: String, required: true },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                timestamp: { type: Date, default: Date.now },
                details: { type: String }
            }
        ],
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
