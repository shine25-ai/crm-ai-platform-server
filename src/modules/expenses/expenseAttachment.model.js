const mongoose = require('mongoose');

const expenseAttachmentSchema = new mongoose.Schema(
    {
        expenseClaimId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExpenseClaim',
            required: true,
            index: true
        },
        fileName: {
            type: String,
            required: true
        },
        fileUrl: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            default: 0
        },
        mimeType: {
            type: String,
            default: ''
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ExpenseAttachment', expenseAttachmentSchema);
