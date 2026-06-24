const mongoose = require('mongoose');

const approvalAttachmentSchema = new mongoose.Schema(
    {
        approvalRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Approval',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        fileUrl: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            required: true
        },
        mimeType: {
            type: String,
            required: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

approvalAttachmentSchema.index({ approvalRequestId: 1 });

module.exports = mongoose.model('ApprovalAttachment', approvalAttachmentSchema);
