const Attendance = require('./attendance.model');
const AppError = require('../../shared/utils/appError');

/**
 * Log employee check-in for a given date
 */
const checkIn = async (employeeId, date, checkInTime) => {
    const active = await Attendance.findOne({ employeeId, checkOut: null });
    if (active) {
        throw new AppError('Already checked in. Please check out first.', 400);
    }
    return await Attendance.create({
        employeeId,
        date,
        checkIn: checkInTime,
        status: 'Present'
    });
};

/**
 * Log employee check-out for a given date
 */
const checkOut = async (employeeId, date, checkOutTime) => {
    const record = await Attendance.findOne({
        employeeId,
        checkOut: null
    }).sort({ createdAt: -1 });
    if (!record) {
        throw new AppError('No active check-in session found', 400);
    }
    record.checkOut = checkOutTime;
    await record.save();
    return record;
};

/**
 * Retrieve all attendance records for a specific employee
 */
const getLogsByEmployee = async (employeeId) => {
    return await Attendance.find({ employeeId }).sort({
        date: -1,
        createdAt: -1
    });
};

module.exports = {
    checkIn,
    checkOut,
    getLogsByEmployee
};
