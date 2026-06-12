const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    },
    { _id: true }
);

const attachmentSchema = new mongoose.Schema(
    {
        name: String,
        url: String,
        type: String,
        size: String
    },
    { _id: false }
);

const taskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium'
        },
        dueDate: Date,
        progress: { type: Number, min: 0, max: 100, default: 0 },
        status: {
            type: String,
            enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
            default: 'Pending'
        },
        comments: [commentSchema],
        attachments: [attachmentSchema]
    },
    { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ assignedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
