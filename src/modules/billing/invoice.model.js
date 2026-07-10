const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        },
        billingType: {
            type: String,
            enum: [
                'Fixed cost',
                'Hourly billing',
                'Monthly billing',
                'Milestone billing',
                'Retainer billing'
            ],
            required: true
        },
        paymentSchedule: {
            type: String,
            enum: [
                'Advance payment',
                'Milestone payment',
                'Monthly recurring invoice',
                'Final delivery payment'
            ],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        taxRate: {
            type: Number,
            default: 18
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            default: 0
        },
        paidAmount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: [
                'Generated',
                'Sent',
                'Paid',
                'Partially paid',
                'Overdue',
                'Cancelled'
            ],
            default: 'Generated'
        },
        issueDate: {
            type: Date,
            default: Date.now
        },
        dueDate: {
            type: Date,
            required: true
        },
        template: {
            type: String,
            enum: ['Standard', 'Professional', 'Creative'],
            default: 'Standard'
        },
        paymentHistory: [
            {
                paymentDate: { type: Date, default: Date.now },
                amount: { type: Number, required: true },
                paymentMode: { type: String, default: 'Bank Transfer' },
                referenceNumber: { type: String, default: '' },
                notes: { type: String, default: '' }
            }
        ],
        notes: {
            type: String,
            default: ''
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
