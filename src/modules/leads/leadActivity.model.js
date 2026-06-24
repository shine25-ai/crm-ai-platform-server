const mongoose = require('mongoose');

const leadActivitySchema = new mongoose.Schema(
    {
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
            index: true
        },
        activityType: {
            type: String,
            enum: [
                'Lead Created',
                'Lead Updated',
                'Assignment Changed',
                'Status Changed',
                'Call Recorded',
                'Meeting Scheduled',
                'Meeting Completed',
                'Follow-Up Scheduled',
                'Follow-Up Completed',
                'Note Added',
                'Note Updated',
                'Note Deleted',
                'Document Uploaded',
                'Document Deleted',
                'Converted'
            ],
            required: true
        },
        description: {
            type: String,
            required: true
        },
        previousStatus: {
            type: String
        },
        currentStatus: {
            type: String
        },
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('LeadActivity', leadActivitySchema);
