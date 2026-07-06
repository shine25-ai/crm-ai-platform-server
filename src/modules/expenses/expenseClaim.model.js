const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            required: true
        },
        note: {
            type: String,
            default: ''
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        changedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const expenseClaimSchema = new mongoose.Schema(
    {
        claimNumber: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        approvalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Approval',
            default: null,
            index: true
        },
        expenseDate: {
            type: Date,
            required: true
        },
        category: {
            type: String,
            enum: [
                'Travel',
                'Meals',
                'Accommodation',
                'Office Supplies',
                'Communication',
                'Training',
                'Medical',
                'Fuel',
                'Client Entertainment',
                'Other'
            ],
            required: true
        },
        merchant: {
            type: String,
            default: '',
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        businessPurpose: {
            type: String,
            required: true,
            trim: true
        },
        projectReference: {
            type: String,
            default: '',
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0.01
        },
        currency: {
            type: String,
            default: 'INR',
            uppercase: true,
            trim: true
        },
        status: {
            type: String,
            enum: [
                'Draft',
                'Submitted',
                'Under Review',
                'Approved',
                'Rejected',
                'Cancelled',
                'Paid'
            ],
            default: 'Draft',
            index: true
        },
        approvedAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        reviewNote: {
            type: String,
            default: ''
        },
        statusHistory: {
            type: [statusHistorySchema],
            default: []
        }
    },
    { timestamps: true }
);

expenseClaimSchema.index({ employeeId: 1, createdAt: -1 });
expenseClaimSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ExpenseClaim', expenseClaimSchema);
