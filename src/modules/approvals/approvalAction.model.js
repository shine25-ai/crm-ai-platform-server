const mongoose = require('mongoose');

const approvalActionSchema = new mongoose.Schema({
    approvalRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Approval', // references the updated Approval model
        required: true
    },
    stageNumber: {
        type: Number,
        required: true
    },
    approverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['Approve', 'Reject', 'Escalate', 'Reassign', 'Cancel'],
        required: true
    },
    comments: {
        type: String,
        default: ''
    },
    decisionKey: {
        type: String,
        default: undefined
    },
    actionDate: {
        type: Date,
        default: Date.now
    }
});

approvalActionSchema.index({ approvalRequestId: 1, stageNumber: 1 });
approvalActionSchema.index(
    { decisionKey: 1 },
    { unique: true, sparse: true, name: 'unique_approval_decision' }
);

module.exports = mongoose.model('ApprovalAction', approvalActionSchema);
