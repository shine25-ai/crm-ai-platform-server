const mongoose = require('mongoose');

const leadMeetingSchema = new mongoose.Schema(
    {
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
            index: true
        },
        meetingDate: {
            type: Date,
            required: true
        },
        location: {
            type: String,
            default: 'Online'
        },
        participants: [
            {
                type: String
            }
        ],
        outcome: {
            type: String,
            default: ''
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('LeadMeeting', leadMeetingSchema);
