const mongoose = require('mongoose');

const projectChangeSchema = new mongoose.Schema(
    {
        field: { type: String, required: true },
        label: { type: String, default: '' },
        oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
        newValue: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    { _id: false }
);

const projectActivitySchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
            index: true
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },
        projectName: {
            type: String,
            required: true,
            trim: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },
        actorType: {
            type: String,
            enum: ['USER', 'SYSTEM'],
            default: 'USER'
        },
        action: {
            type: String,
            required: true,
            index: true
        },
        entityType: {
            type: String,
            enum: ['Project', 'Milestone', 'Invoice', 'Payment', 'Document'],
            default: 'Project'
        },
        entityId: {
            type: String,
            default: ''
        },
        summary: {
            type: String,
            required: true,
            trim: true
        },
        changes: {
            type: [projectChangeSchema],
            default: []
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        source: {
            type: String,
            enum: ['API', 'AUTOMATION', 'IMPORT'],
            default: 'API'
        },
        ipAddress: {
            type: String,
            default: ''
        },
        userAgent: {
            type: String,
            default: ''
        },
        occurredAt: {
            type: Date,
            default: Date.now,
            immutable: true,
            index: true
        }
    },
    { timestamps: true }
);

projectActivitySchema.index({ customerId: 1, projectId: 1, occurredAt: -1 });
projectActivitySchema.index({ projectId: 1, action: 1, occurredAt: -1 });

module.exports = mongoose.model('ProjectActivity', projectActivitySchema);
