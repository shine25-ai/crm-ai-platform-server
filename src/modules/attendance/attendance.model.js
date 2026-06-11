const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        date: {
            type: String, // YYYY-MM-DD
            required: true
        },
        checkIn: {
            type: String, // HH:MM AM/PM
            required: true
        },
        checkOut: {
            type: String, // HH:MM AM/PM
            default: null
        },
        status: {
            type: String,
            enum: ['Present', 'Absent', 'On Leave'],
            default: 'Present'
        }
    },
    { timestamps: true }
);

// Index for search performance (multiple entries per day allowed)
attendanceSchema.index({ employeeId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
