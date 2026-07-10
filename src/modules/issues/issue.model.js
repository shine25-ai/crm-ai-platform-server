const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task'
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer'
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium'
        },
        severity: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Blocker'],
            default: 'Medium'
        },
        status: {
            type: String,
            enum: ['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'],
            default: 'Open'
        },
        dueDate: {
            type: Date
        },
        attachments: [
            {
                fileName: { type: String },
                filePath: { type: String },
                uploadedAt: { type: Date, default: Date.now }
            }
        ],
        comments: [
            {
                comment: { type: String, required: true },
                createdBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                createdAt: { type: Date, default: Date.now }
            }
        ],
        activityHistory: [
            {
                action: { type: String, required: true },
                details: { type: String },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                timestamp: { type: Date, default: Date.now }
            }
        ],
        isEscalated: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Issue', issueSchema);
