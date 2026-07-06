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
        shiftAssignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ShiftAssignment',
            default: null
        },
        shiftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shift',
            default: null
        },
        shiftSnapshot: {
            code: { type: String, default: '' },
            name: { type: String, default: '' },
            configurationType: { type: String, default: '' },
            segmentIndex: { type: Number, default: null },
            segmentName: { type: String, default: '' },
            startTime: { type: String, default: '' },
            endTime: { type: String, default: '' },
            timezone: { type: String, default: '' },
            overnight: { type: Boolean, default: false },
            unpaidBreakMinutes: { type: Number, default: 0 },
            graceInMinutes: { type: Number, default: 0 },
            graceOutMinutes: { type: Number, default: 0 }
        },
        scheduledStart: {
            type: Date,
            default: null
        },
        scheduledEnd: {
            type: Date,
            default: null
        },
        expectedMinutes: {
            type: Number,
            default: 0
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
        grossMinutes: {
            type: Number,
            default: 0
        },
        workedMinutes: {
            type: Number,
            default: 0
        },
        overtimeMinutes: {
            type: Number,
            default: 0
        },
        deficitMinutes: {
            type: Number,
            default: 0
        },
        lateMinutes: {
            type: Number,
            default: 0
        },
        earlyDepartureMinutes: {
            type: Number,
            default: 0
        },
        timesheetStatus: {
            type: String,
            enum: [
                'Open',
                'Complete',
                'Under Hours',
                'Overtime',
                'Unscheduled'
            ],
            default: 'Unscheduled'
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
        },
        leaveMeta: {
            approvalId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Approval',
                default: null
            },
            leaveTypeName: { type: String, default: '' },
            durationType: { type: String, default: '' },
            calculatedDays: { type: Number, default: 0 }
        }
    },
    { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, shiftDate: 1 });
attendanceSchema.index({
    employeeId: 1,
    shiftAssignmentId: 1,
    shiftDate: 1
});

module.exports = mongoose.model('Attendance', attendanceSchema);
