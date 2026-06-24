const mongoose = require('mongoose');

const leadFollowUpSchema = new mongoose.Schema(
    {
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
            index: true
        },
        followUpDate: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['Call', 'Email', 'Meeting', 'Other'],
            required: true
        },
        comments: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['Scheduled', 'Completed', 'Cancelled', 'Overdue'],
            default: 'Scheduled'
        },
        reminderSent: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('LeadFollowUp', leadFollowUpSchema);
