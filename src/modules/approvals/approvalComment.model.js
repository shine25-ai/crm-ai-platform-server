const mongoose = require('mongoose');

const approvalCommentSchema = new mongoose.Schema(
    {
        approvalRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Approval',
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        commentText: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

approvalCommentSchema.index({ approvalRequestId: 1, createdAt: 1 });

module.exports = mongoose.model('ApprovalComment', approvalCommentSchema);
