const mongoose = require('mongoose');

const aiUsageLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true // e.g. 'chat', 'lead-summary', 'report-summary'
    },
    promptTokens: {
        type: Number,
        default: 0
    },
    completionTokens: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AIUsageLog', aiUsageLogSchema);
