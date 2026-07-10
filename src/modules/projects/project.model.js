const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
    {
        projectName: {
            type: String,
            required: true,
            trim: true
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        projectManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium'
        },
        status: {
            type: String,
            enum: ['Planned', 'Active', 'On Hold', 'Completed', 'Cancelled'],
            default: 'Planned'
        },
        budget: {
            type: Number,
            required: true,
            default: 0
        },
        description: {
            type: String,
            default: ''
        },
        isArchived: {
            type: Boolean,
            default: false
        },
        milestones: [
            {
                name: { type: String, required: true },
                description: { type: String, default: '' },
                dueDate: { type: Date },
                status: {
                    type: String,
                    enum: ['Pending', 'Completed'],
                    default: 'Pending'
                }
            }
        ],
        activityHistory: [
            {
                action: { type: String, required: true },
                details: { type: String, default: '' },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                timestamp: { type: Date, default: Date.now }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
