const mongoose = require('mongoose');

const shiftSegmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        startTime: {
            type: String,
            required: true,
            match: /^([01]\d|2[0-3]):[0-5]\d$/
        },
        endTime: {
            type: String,
            required: true,
            match: /^([01]\d|2[0-3]):[0-5]\d$/
        },
        unpaidBreakMinutes: {
            type: Number,
            min: 0,
            default: 0
        },
        graceInMinutes: {
            type: Number,
            min: 0,
            default: 0
        },
        graceOutMinutes: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    { _id: false }
);

const shiftSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: '',
            trim: true
        },
        configurationType: {
            type: String,
            enum: ['SINGLE', 'DOUBLE', 'TRIPLE'],
            required: true,
            default: 'SINGLE'
        },
        segments: {
            type: [shiftSegmentSchema],
            required: true
        },
        workDays: {
            type: [Number],
            default: [1, 2, 3, 4, 5],
            validate: {
                validator: (days) =>
                    days.length > 0 &&
                    days.every(
                        (day, index) =>
                            Number.isInteger(day) &&
                            day >= 0 &&
                            day <= 6 &&
                            days.indexOf(day) === index
                    ),
                message: 'Work days must contain unique values from 0 to 6'
            }
        },
        timezone: {
            type: String,
            default: () => process.env.APP_TIMEZONE || 'Asia/Kolkata',
            trim: true
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

shiftSchema.pre('validate', function validateSegmentCount() {
    const requiredCounts = { SINGLE: 1, DOUBLE: 2, TRIPLE: 3 };
    const expected = requiredCounts[this.configurationType];
    if (!Array.isArray(this.segments) || this.segments.length !== expected) {
        this.invalidate(
            'segments',
            `${this.configurationType} configuration requires exactly ${expected} shift segment(s)`
        );
    }
});

module.exports = mongoose.model('Shift', shiftSchema);
