const mongoose = require('mongoose');

const taskActivityLogSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        action: {
            type: String,
            enum: [
                'CREATED',
                'ASSIGNED',
                'REASSIGNED',
                'STATUS_UPDATED',
                'PROGRESS_UPDATED',
                'PRIORITY_UPDATED',
                'COMMENT_ADDED',
                'COMMENT_EDITED',
                'COMMENT_DELETED',
                'ATTACHMENT_ADDED',
                'ATTACHMENT_DELETED',
                'UPDATED',
                'DELETED'
            ],
            required: true
        },
        details: { type: String, default: '' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('TaskActivityLog', taskActivityLogSchema);
