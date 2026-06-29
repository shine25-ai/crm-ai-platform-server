const mongoose = require('mongoose');

const leaveBalanceAdjustmentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                'Accrual',
                'Manual Adjustment',
                'Reserved',
                'Released',
                'Used',
                'Carry Forward',
                'Expiry'
            ],
            required: true
        },
        amount: { type: Number, required: true },
        note: { type: String, default: '' },
        approvalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Approval',
            default: null
        },
        adjustedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        adjustedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const leaveBalanceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        leavePolicyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LeavePolicy',
            required: true
        },
        leaveYear: { type: Number, required: true },
        leaveTypeName: { type: String, required: true },
        leaveTypeCode: { type: String, required: true },
        openingBalance: { type: Number, default: 0 },
        accruedBalance: { type: Number, default: 0 },
        usedBalance: { type: Number, default: 0 },
        pendingBalance: { type: Number, default: 0 },
        carriedForwardBalance: { type: Number, default: 0 },
        lwpTaken: { type: Number, default: 0 },
        adjustments: { type: [leaveBalanceAdjustmentSchema], default: [] }
    },
    { timestamps: true }
);

leaveBalanceSchema.virtual('availableBalance').get(function availableBalance() {
    return Math.max(
        0,
        Number(this.openingBalance || 0) +
            Number(this.accruedBalance || 0) +
            Number(this.carriedForwardBalance || 0) -
            Number(this.usedBalance || 0) -
            Number(this.pendingBalance || 0)
    );
});

leaveBalanceSchema.set('toJSON', { virtuals: true });
leaveBalanceSchema.set('toObject', { virtuals: true });
leaveBalanceSchema.index(
    { employeeId: 1, leavePolicyId: 1, leaveYear: 1 },
    { unique: true }
);

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
