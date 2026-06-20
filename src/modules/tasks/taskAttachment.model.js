const mongoose = require('mongoose');

const taskAttachmentSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true,
            index: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: { type: String, required: true },
        filePath: { type: String, required: true },
        mimeType: { type: String, default: '' },
        fileSize: { type: Number, default: 0 },
        isDeleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

module.exports = mongoose.model('TaskAttachment', taskAttachmentSchema);
