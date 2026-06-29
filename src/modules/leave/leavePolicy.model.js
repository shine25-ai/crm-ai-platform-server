const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema(
    {
        leaveTypeName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        leaveTypeCode: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        annualEntitlement: { type: Number, default: 0 },
        isPaid: { type: Boolean, default: true },
        isUnlimited: { type: Boolean, default: false },
        accrualMode: {
            type: String,
            enum: ['Monthly Prorated', 'Annual Upfront', 'Manual'],
            default: 'Monthly Prorated'
        },
        dayCountingMode: {
            type: String,
            enum: ['workingDays', 'calendarDays'],
            default: 'workingDays'
        },
        allowHalfDay: { type: Boolean, default: true },
        carryForwardEnabled: { type: Boolean, default: false },
        carryForwardCap: { type: Number, default: 0 },
        expiresAtYearEnd: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

leavePolicySchema.index({ leaveTypeCode: 1, isActive: 1 });

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
