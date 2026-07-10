const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
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
        activity: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        startTime: {
            type: String // e.g. "09:00"
        },
        endTime: {
            type: String // e.g. "17:00"
        },
        totalHours: {
            type: Number,
            required: true
        },
        billingType: {
            type: String,
            enum: ['Billable', 'Non-billable'],
            default: 'Billable'
        },
        description: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
            default: 'Draft'
        },
        submittedAt: {
            type: Date
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: {
            type: Date
        },
        rejectionReason: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Timesheet', timesheetSchema);
