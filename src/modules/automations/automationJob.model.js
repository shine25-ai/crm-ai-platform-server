const mongoose = require('mongoose');

const automationJobSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: [
                'report-auto-delivery',
                'lead-distribution',
                'db-cleanup',
                'system-backup'
            ],
            required: true
        },
        schedule: {
            type: String,
            required: true // Cron expression e.g. '0 9 * * *'
        },
        taskConfig: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        lastRun: {
            type: Date,
            default: null
        },
        nextRun: {
            type: Date,
            default: null
        },
        lastStatus: {
            type: String,
            enum: ['Success', 'Failed', 'Never Run'],
            default: 'Never Run'
        },
        errorMessage: {
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('AutomationJob', automationJobSchema);
