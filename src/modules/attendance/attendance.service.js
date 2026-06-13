const Attendance = require('./attendance.model');
const AppError = require('../../shared/utils/appError');
const { logActivity } = require('../../shared/services/audit.service');

const toDateTime = (shiftDate, timeValue) => {
    if (!timeValue) return new Date();
    const parsed = new Date(timeValue);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return new Date(`${shiftDate} ${timeValue}`);
};

const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    return Math.max(
        0,
        (new Date(end).getTime() - new Date(start).getTime()) / 36e5
    );
};

const recalculateTotals = (record) => {
    record.breakHours = record.breaks.reduce(
        (total, entry) => total + (entry.durationHours || 0),
        0
    );
    record.workingHours = record.checkOut
        ? Math.max(
              0,
              calculateHours(record.checkIn, record.checkOut) -
                  record.breakHours
          )
        : 0;
};

const checkIn = async (
    employeeId,
    shiftDate,
    checkInTime,
    location,
    userId
) => {
    const active = await Attendance.findOne({ employeeId, checkOut: null });
    if (active) {
        throw new AppError('Already checked in. Please check out first.', 400);
    }
    const record = await Attendance.create({
        employeeId,
        shiftDate,
        checkIn: toDateTime(shiftDate, checkInTime),
        location: location || {},
        attendanceStatus: 'Present'
    });
    await logActivity(userId, 'CHECK_IN', 'Attendance', 'Checked in for shift');
    return record;
};

const checkOut = async (employeeId, shiftDate, checkOutTime, userId) => {
    const record = await Attendance.findOne({
        employeeId,
        checkOut: null
    }).sort({ createdAt: -1 });
    if (!record) {
        throw new AppError('No active check-in session found', 400);
    }
    record.checkOut = toDateTime(shiftDate || record.shiftDate, checkOutTime);
    const openBreak = record.breaks.find((entry) => !entry.end);
    if (openBreak) {
        openBreak.end = record.checkOut;
        openBreak.durationHours = calculateHours(
            openBreak.start,
            openBreak.end
        );
    }
    recalculateTotals(record);
    await record.save();
    await logActivity(
        userId,
        'CHECK_OUT',
        'Attendance',
        'Checked out from shift'
    );
    return record;
};

const breakStart = async (employeeId, userId) => {
    const record = await Attendance.findOne({
        employeeId,
        checkOut: null
    }).sort({
        createdAt: -1
    });
    if (!record) throw new AppError('No active check-in session found', 400);
    if (record.breaks.some((entry) => !entry.end)) {
        throw new AppError('Break already in progress', 400);
    }
    record.breaks.push({ start: new Date() });
    await record.save();
    await logActivity(userId, 'BREAK_START', 'Attendance', 'Started break');
    return record;
};

const breakEnd = async (employeeId, userId) => {
    const record = await Attendance.findOne({
        employeeId,
        checkOut: null
    }).sort({
        createdAt: -1
    });
    if (!record) throw new AppError('No active check-in session found', 400);
    const openBreak = record.breaks.find((entry) => !entry.end);
    if (!openBreak) throw new AppError('No active break found', 400);
    openBreak.end = new Date();
    openBreak.durationHours = calculateHours(openBreak.start, openBreak.end);
    recalculateTotals(record);
    await record.save();
    await logActivity(userId, 'BREAK_END', 'Attendance', 'Ended break');
    return record;
};

const getLogsByEmployee = async (employeeId) => {
    return await Attendance.find({ employeeId }).sort({
        shiftDate: -1,
        createdAt: -1
    });
};

const getMonthlyReport = async (employeeId, month, year) => {
    const monthValue = String(month || new Date().getMonth() + 1).padStart(
        2,
        '0'
    );
    const yearValue = String(year || new Date().getFullYear());
    const records = await Attendance.find({
        employeeId,
        shiftDate: { $regex: `^${yearValue}-${monthValue}` }
    }).sort({ shiftDate: 1 });

    return {
        month: monthValue,
        year: yearValue,
        summary: {
            presentDays: records.filter(
                (record) => record.attendanceStatus === 'Present'
            ).length,
            totalWorkingHours: records.reduce(
                (total, record) => total + (record.workingHours || 0),
                0
            ),
            totalBreakHours: records.reduce(
                (total, record) => total + (record.breakHours || 0),
                0
            )
        },
        records
    };
};

module.exports = {
    checkIn,
    checkOut,
    breakStart,
    breakEnd,
    getLogsByEmployee,
    getMonthlyReport
};
