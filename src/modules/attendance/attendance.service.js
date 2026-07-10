const Attendance = require('./attendance.model');
const AppError = require('../../shared/utils/appError');
const { logActivity } = require('../../shared/services/audit.service');
const shiftService = require('../shifts/shift.service');
const { calculateTimesheet } = require('../shifts/shiftTime.utils');
const gpsTrackingService = require('../gpsTracking/gpsTracking.service');

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
    const actualBreakHours = record.breaks.reduce(
        (total, entry) => total + (entry.durationHours || 0),
        0
    );
    const scheduledBreakHours =
        Number(record.shiftSnapshot?.unpaidBreakMinutes || 0) / 60;
    const breakHours = Math.max(actualBreakHours, scheduledBreakHours);
    const totals = calculateTimesheet({
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        breakMinutes: breakHours * 60,
        scheduledStart: record.scheduledStart,
        scheduledEnd: record.scheduledEnd,
        expectedMinutes: record.expectedMinutes,
        graceInMinutes: record.shiftSnapshot?.graceInMinutes,
        graceOutMinutes: record.shiftSnapshot?.graceOutMinutes
    });

    record.breakHours = totals.breakMinutes / 60;
    record.workingHours = totals.workedMinutes / 60;
    record.grossMinutes = totals.grossMinutes;
    record.workedMinutes = totals.workedMinutes;
    record.overtimeMinutes = totals.overtimeMinutes;
    record.deficitMinutes = totals.deficitMinutes;
    record.lateMinutes = totals.lateMinutes;
    record.earlyDepartureMinutes = totals.earlyDepartureMinutes;
    record.timesheetStatus = record.shiftAssignmentId
        ? totals.timesheetStatus
        : record.checkOut
          ? 'Unscheduled'
          : 'Open';
    if (
        totals.lateMinutes > 0 &&
        ['Present', 'Late'].includes(record.attendanceStatus)
    ) {
        record.attendanceStatus = 'Late';
    }
};

const toRadians = (value) => (value * Math.PI) / 180;

const distanceInMeters = (from, to) => {
    const earthRadius = 6371000;
    const dLat = toRadians(to.latitude - from.latitude);
    const dLon = toRadians(to.longitude - from.longitude);
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
};

const validateLocation = async (location = {}, employeeId = null) => {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return {
            ...location,
            validated: false,
            validationMessage: 'Latitude and longitude are required'
        };
    }

    const geofenceValidation = await gpsTrackingService.validateAgainstGeofence(
        employeeId,
        { ...location, latitude, longitude }
    );
    if (geofenceValidation.geofenceId || geofenceValidation.geofenceName) {
        return geofenceValidation;
    }

    const officeLatitude = Number(process.env.ATTENDANCE_OFFICE_LATITUDE);
    const officeLongitude = Number(process.env.ATTENDANCE_OFFICE_LONGITUDE);
    const allowedRadius = Number(process.env.ATTENDANCE_ALLOWED_RADIUS_METERS);

    if (
        !Number.isFinite(officeLatitude) ||
        !Number.isFinite(officeLongitude) ||
        !Number.isFinite(allowedRadius)
    ) {
        return {
            ...location,
            latitude,
            longitude,
            validated: Boolean(location.validated),
            validationMessage: 'GPS policy not configured'
        };
    }

    const distance = distanceInMeters(
        { latitude: officeLatitude, longitude: officeLongitude },
        { latitude, longitude }
    );

    return {
        ...location,
        latitude,
        longitude,
        distanceFromOfficeMeters: Math.round(distance),
        validated: distance <= allowedRadius,
        validationMessage:
            distance <= allowedRadius
                ? 'Within allowed attendance radius'
                : `Outside allowed attendance radius of ${allowedRadius} meters`
    };
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
    const checkIn = toDateTime(shiftDate, checkInTime);
    const resolvedShift = await shiftService.getAssignmentForCheckIn(
        employeeId,
        shiftDate,
        checkIn
    );
    const attendanceShiftDate = resolvedShift?.shiftDate || shiftDate;
    const shiftFields = {};

    if (resolvedShift) {
        const existing = await Attendance.exists({
            employeeId,
            shiftDate: attendanceShiftDate,
            shiftAssignmentId: resolvedShift.assignment._id
        });
        if (existing) {
            throw new AppError(
                'Attendance has already been recorded for the assigned shift',
                400
            );
        }

        const { assignment, shift, segment, schedule } = resolvedShift;
        const lateMinutes = Math.max(
            0,
            Math.round((checkIn - schedule.scheduledStart) / 60000) -
                Number(segment.graceInMinutes || 0)
        );
        Object.assign(shiftFields, {
            shiftAssignmentId: assignment._id,
            shiftId: shift._id,
            shiftSnapshot: {
                code: shift.code,
                name: shift.name,
                configurationType: shift.configurationType,
                segmentIndex: assignment.segmentIndex,
                segmentName: segment.name,
                startTime: segment.startTime,
                endTime: segment.endTime,
                timezone: shift.timezone,
                overnight: schedule.overnight,
                unpaidBreakMinutes: segment.unpaidBreakMinutes,
                graceInMinutes: segment.graceInMinutes,
                graceOutMinutes: segment.graceOutMinutes
            },
            scheduledStart: schedule.scheduledStart,
            scheduledEnd: schedule.scheduledEnd,
            expectedMinutes: schedule.expectedMinutes,
            lateMinutes,
            timesheetStatus: 'Open'
        });
    }

    const validatedLocation = await validateLocation(location, employeeId);
    const gpsSettings = await gpsTrackingService.getSettings();
    if (
        gpsSettings.enforceAttendanceGeofence &&
        validatedLocation.validated === false
    ) {
        throw new AppError(
            validatedLocation.validationMessage ||
                'Attendance check-in is outside the allowed geofence',
            400
        );
    }

    const record = await Attendance.create({
        employeeId,
        shiftDate: attendanceShiftDate,
        checkIn,
        location: validatedLocation,
        attendanceStatus: shiftFields.lateMinutes > 0 ? 'Late' : 'Present',
        ...shiftFields
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

const buildAttendanceQuery = (filters = {}, fallbackEmployeeId = null) => {
    const query = {};

    if (filters.employeeId) {
        query.employeeId = filters.employeeId;
    } else if (fallbackEmployeeId) {
        query.employeeId = fallbackEmployeeId;
    }

    if (filters.from || filters.to) {
        query.shiftDate = {};
        if (filters.from) query.shiftDate.$gte = filters.from;
        if (filters.to) query.shiftDate.$lte = filters.to;
    }

    if (filters.month || filters.year) {
        const monthValue = String(
            filters.month || new Date().getMonth() + 1
        ).padStart(2, '0');
        const yearValue = String(filters.year || new Date().getFullYear());
        query.shiftDate = { $regex: `^${yearValue}-${monthValue}` };
    }

    return query;
};

const getLogsByEmployee = async (employeeId, filters = {}) => {
    return await Attendance.find(buildAttendanceQuery(filters, employeeId))
        .populate('employeeId', 'name employeeId email designation')
        .populate('shiftId', 'code name configurationType')
        .sort({
            shiftDate: -1,
            createdAt: -1
        });
};

const getMonthlyReport = async (employeeId, month, year, filters = {}) => {
    const monthValue = String(month || new Date().getMonth() + 1).padStart(
        2,
        '0'
    );
    const yearValue = String(year || new Date().getFullYear());
    const records = await Attendance.find(
        buildAttendanceQuery(
            { ...filters, month: monthValue, year: yearValue },
            employeeId
        )
    )
        .populate('employeeId', 'name employeeId email designation')
        .populate('shiftId', 'code name configurationType')
        .sort({ shiftDate: 1 });

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
            ),
            scheduledHours:
                records.reduce(
                    (total, record) => total + (record.expectedMinutes || 0),
                    0
                ) / 60,
            overtimeHours:
                records.reduce(
                    (total, record) => total + (record.overtimeMinutes || 0),
                    0
                ) / 60,
            deficitHours:
                records.reduce(
                    (total, record) => total + (record.deficitMinutes || 0),
                    0
                ) / 60,
            lateDays: records.filter((record) => record.lateMinutes > 0).length
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
