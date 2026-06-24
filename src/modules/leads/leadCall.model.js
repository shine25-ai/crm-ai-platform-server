const mongoose = require('mongoose');

const leadCallSchema = new mongoose.Schema(
    {
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            required: true,
            index: true
        },
        callDate: {
            type: Date,
            default: Date.now
        },
        duration: {
            type: Number, // in seconds
            default: 0
        },
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

module.exports = mongoose.model('LeadCall', leadCallSchema);
