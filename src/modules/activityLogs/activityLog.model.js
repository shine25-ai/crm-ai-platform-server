const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        action: {
            type: String,
            required: true
        },
        module: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        ipAddress: {
            type: String,
            default: ''
        },
        deviceType: {
            type: String,
            default: ''
        },
        location: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
