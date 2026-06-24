const mongoose = require('mongoose');

const workflowStageConfigSchema = new mongoose.Schema(
    {
        stageNumber: {
            type: Number,
            required: true,
            min: 1
        },
        stageName: {
            type: String,
            required: true,
            trim: true
        },
        approverRole: {
            type: String,
            required: true,
            enum: ['MANAGER', 'DEPARTMENT_HEAD', 'HR', 'ADMIN', 'SPECIFIC_USER']
        },
        specificApproverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        slaDays: {
            type: Number,
            default: 3
        }
    },
    { _id: false }
);

const approvalWorkflowSchema = new mongoose.Schema(
    {
        workflowName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        requestType: {
            type: String,
            required: true,
            unique: true,
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
        stages: [workflowStageConfigSchema],
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

approvalWorkflowSchema.index({ requestType: 1, isActive: 1 });

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
