const mongoose = require('mongoose');

const leadOwnerHistorySchema = new mongoose.Schema(
    {
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
            index: true
        },
        previousOwnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        newOwnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        changedAt: {
            type: Date,
            default: Date.now,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('LeadOwnerHistory', leadOwnerHistorySchema);
