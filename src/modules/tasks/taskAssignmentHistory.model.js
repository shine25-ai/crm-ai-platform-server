const mongoose = require('mongoose');

const taskAssignmentHistorySchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
            index: true
        },
        previousAssignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        newAssignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        assignedAt: { type: Date, default: Date.now }
    },
    { _id: true }
);

module.exports = mongoose.model(
    'TaskAssignmentHistory',
    taskAssignmentHistorySchema
);
