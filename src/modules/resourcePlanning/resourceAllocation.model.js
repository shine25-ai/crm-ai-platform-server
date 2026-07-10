const mongoose = require('mongoose');

const resourceAllocationSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true
        },
        allocationPercentage: {
            type: Number,
            required: true,
            min: 1,
            max: 100
        },
        role: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        billingType: {
            type: String,
            enum: ['Billable', 'Non-billable'],
            default: 'Billable'
        },
        billingRate: {
            type: Number,
            default: 0
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ResourceAllocation', resourceAllocationSchema);
