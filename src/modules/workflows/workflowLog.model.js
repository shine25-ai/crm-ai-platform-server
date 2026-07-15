const mongoose = require('mongoose');

const workflowLogSchema = new mongoose.Schema({
    workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workflow',
        required: true
    },
    triggerEvent: {
        type: String,
        required: true
    },
    matchedConditions: {
        type: Boolean,
        required: true
    },
    executedActions: [
        {
            actionType: { type: String, required: true },
            status: {
                type: String,
                enum: ['Success', 'Failed'],
                required: true
            },
            error: { type: String, default: null },
            durationMs: { type: Number, default: 0 }
        }
    ],
    status: {
        type: String,
        enum: ['Success', 'Failed'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('WorkflowLog', workflowLogSchema);
