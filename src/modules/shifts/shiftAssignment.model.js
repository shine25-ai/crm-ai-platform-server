const mongoose = require('mongoose');

const shiftAssignmentSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        shiftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shift',
            required: true
        },
        segmentIndex: {
            type: Number,
            min: 0,
            required: true,
            default: 0
        },
        effectiveFrom: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/
        },
        effectiveTo: {
            type: String,
            default: null,
            match: /^\d{4}-\d{2}-\d{2}$/
        },
        workDays: {
            type: [Number],
            default: undefined
        },
        notes: {
            type: String,
            default: '',
            trim: true
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

shiftAssignmentSchema.index({
    employeeId: 1,
    effectiveFrom: 1,
    effectiveTo: 1,
    status: 1
});

module.exports = mongoose.model('ShiftAssignment', shiftAssignmentSchema);
