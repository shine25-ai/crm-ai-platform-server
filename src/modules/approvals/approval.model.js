const mongoose = require('mongoose');

const stageApprovalSchema = new mongoose.Schema(
    {
        stageNumber: { type: Number, required: true },
        stageName: { type: String, required: true },
        approverRole: { type: String, required: true },
        approverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending'
        },
        actedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        actedAt: { type: Date, default: null },
        comments: { type: String, default: '' }
    },
    { _id: false }
);

const approvalSchema = new mongoose.Schema(
    {
        requestNumber: {
            type: String,
            required: true,
            unique: true
        },
        requestType: {
            type: String,
            required: true,
            enum: [
                'Leave Request',
                'Attendance Correction',
                'Expense Claim',
                'Profile Update',
                'Overtime Request',
                'Asset Request',
                'Travel Request',
                'Document Request',
                'Custom Request'
            ]
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        workflowId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ApprovalWorkflow',
            required: true
        },
        currentStageNumber: {
            type: Number,
            default: 1
        },
        status: {
            type: String,
            enum: [
                'Draft',
                'Submitted',
                'Pending Approval',
                'Approved',
                'Rejected',
                'Cancelled',
                'Escalated'
            ],
            default: 'Pending Approval'
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium'
        },
        effectiveDate: {
            type: Date,
            required: true
        },
        requestedAmount: {
            type: Number,
            default: 0
        },
        requestData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        currentApproverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        stageApprovals: {
            type: [stageApprovalSchema],
            default: []
        },
        escalatedAt: {
            type: Date,
            default: null
        },
        // Kept for backward compatibility with old code if any exists
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        decisionNote: String
    },
    { timestamps: true }
);

approvalSchema.index({ employeeId: 1, status: 1, createdAt: -1 });
approvalSchema.index({ currentApproverId: 1, status: 1 });
approvalSchema.index({ requestNumber: 1 });
approvalSchema.index({ 'stageApprovals.approverId': 1, status: 1 });

module.exports = mongoose.model('Approval', approvalSchema);
