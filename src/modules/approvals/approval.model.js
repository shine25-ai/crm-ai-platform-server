const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        requestType: {
            type: String,
            enum: [
                'Leave Request',
                'Attendance Correction',
                'Expense Claim',
                'Profile Update'
            ],
            required: true
        },
        requestData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending'
        },
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

module.exports = mongoose.model('Approval', approvalSchema);
