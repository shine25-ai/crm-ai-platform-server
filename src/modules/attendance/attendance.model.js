const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        shiftDate: {
            type: String,
            required: true
        },
        checkIn: {
            type: Date,
            required: true
        },
        checkOut: {
            type: Date,
            default: null
        },
        workingHours: {
            type: Number,
            default: 0
        },
        breakHours: {
            type: Number,
            default: 0
        },
        location: {
            latitude: Number,
            longitude: Number,
            address: String,
            validated: { type: Boolean, default: false },
            distanceFromOfficeMeters: Number,
            validationMessage: String
        },
        attendanceStatus: {
            type: String,
            enum: ['Present', 'Absent', 'On Leave', 'Half Day', 'Late'],
            default: 'Present'
        },
        breaks: {
            type: [
                {
                    start: Date,
                    end: Date,
                    durationHours: { type: Number, default: 0 }
                }
            ],
            default: []
        }
    },
    { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, shiftDate: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
