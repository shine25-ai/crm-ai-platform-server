const Shift = require('./shift.model');
const ShiftAssignment = require('./shiftAssignment.model');
const Employee = require('../employees/employee.model');
const Attendance = require('../attendance/attendance.model');
const AppError = require('../../shared/utils/appError');
const {
    getExpectedMinutes,
    buildScheduleWindow
} = require('./shiftTime.utils');

const normalizeShiftPayload = (payload) => ({
    ...payload,
    code: String(payload.code || '')
        .trim()
        .toUpperCase(),
    segments: (payload.segments || []).map((segment) => ({
        name: String(segment.name || '').trim(),
        startTime: segment.startTime,
        endTime: segment.endTime,
        unpaidBreakMinutes: Number(segment.unpaidBreakMinutes || 0),
        graceInMinutes: Number(segment.graceInMinutes || 0),
        graceOutMinutes: Number(segment.graceOutMinutes || 0)
    })),
    workDays: (payload.workDays || [1, 2, 3, 4, 5]).map(Number)
});

const serializeShift = (shift) => {
    const value = shift.toObject ? shift.toObject() : shift;
    return {
        ...value,
        expectedDailyMinutes: (value.segments || []).reduce(
            (total, segment) => total + getExpectedMinutes(segment),
            0
        ),
        segments: (value.segments || []).map((segment) => ({
            ...segment,
            expectedMinutes: getExpectedMinutes(segment)
        }))
    };
};

const getShifts = async (filters = {}) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    const shifts = await Shift.find(query).sort({ createdAt: -1 });
    return shifts.map(serializeShift);
};

const getShiftById = async (id) => {
    const shift = await Shift.findById(id);
    if (!shift) throw new AppError('Shift Master not found', 404);
    return shift;
};

const createShift = async (payload, userId) => {
    const data = normalizeShiftPayload(payload);
    if (await Shift.exists({ code: data.code })) {
        throw new AppError('Shift code already exists', 400);
    }
    const shift = await Shift.create({
        ...data,
        createdBy: userId,
        updatedBy: userId
    });
    return serializeShift(shift);
};

const updateShift = async (id, payload, userId) => {
    const shift = await getShiftById(id);
    const data = normalizeShiftPayload({
        ...shift.toObject(),
        ...payload,
        segments: payload.segments || shift.segments,
        workDays: payload.workDays || shift.workDays
    });

    if (
        data.code !== shift.code &&
        (await Shift.exists({ code: data.code, _id: { $ne: id } }))
    ) {
        throw new AppError('Shift code already exists', 400);
    }

    Object.assign(shift, data, { updatedBy: userId });
    await shift.save();
    return serializeShift(shift);
};

const deleteShift = async (id) => {
    const shift = await getShiftById(id);
    const hasAssignments = await ShiftAssignment.exists({ shiftId: id });
    if (hasAssignments) {
        throw new AppError(
            'This shift has assignment history and cannot be deleted. Set it to Inactive instead.',
            400
        );
    }
    await shift.deleteOne();
};

const hasDateOverlap = (leftStart, leftEnd, rightStart, rightEnd) => {
    const leftFinish = leftEnd || '9999-12-31';
    const rightFinish = rightEnd || '9999-12-31';
    return leftStart <= rightFinish && rightStart <= leftFinish;
};

const validateAssignment = async (payload, ignoreId = null) => {
    const employee = await Employee.findById(payload.employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const shift = await getShiftById(payload.shiftId);
    if (shift.status !== 'Active') {
        throw new AppError('Only an active Shift Master can be assigned', 400);
    }
    if (
        !Number.isInteger(Number(payload.segmentIndex)) ||
        Number(payload.segmentIndex) < 0 ||
        Number(payload.segmentIndex) >= shift.segments.length
    ) {
        throw new AppError('Selected shift segment is invalid', 400);
    }
    if (payload.effectiveTo && payload.effectiveFrom > payload.effectiveTo) {
        throw new AppError(
            'Effective To must be on or after Effective From',
            400
        );
    }

    const existingAssignments = await ShiftAssignment.find({
        employeeId: payload.employeeId,
        status: 'Active',
        ...(ignoreId ? { _id: { $ne: ignoreId } } : {})
    });
    const overlaps = existingAssignments.some((assignment) =>
        hasDateOverlap(
            assignment.effectiveFrom,
            assignment.effectiveTo,
            payload.effectiveFrom,
            payload.effectiveTo
        )
    );
    if (overlaps) {
        throw new AppError(
            'Employee already has an active shift assignment in this date range',
            400
        );
    }

    return shift;
};

const getAssignments = async (filters = {}) => {
    const query = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.shiftId) query.shiftId = filters.shiftId;
    if (filters.status) query.status = filters.status;

    return await ShiftAssignment.find(query)
        .populate('employeeId', 'employeeId name email designation department')
        .populate(
            'shiftId',
            'code name configurationType segments workDays status timezone'
        )
        .populate('assignedBy', 'name email')
        .sort({ effectiveFrom: -1, createdAt: -1 });
};

const createAssignment = async (payload, userId) => {
    await validateAssignment(payload);
    const assignment = await ShiftAssignment.create({
        ...payload,
        segmentIndex: Number(payload.segmentIndex),
        effectiveTo: payload.effectiveTo || null,
        assignedBy: userId
    });
    return (await getAssignments({ employeeId: assignment.employeeId })).find(
        (entry) => String(entry._id) === String(assignment._id)
    );
};

const updateAssignment = async (id, payload, userId) => {
    const assignment = await ShiftAssignment.findById(id);
    if (!assignment) throw new AppError('Shift assignment not found', 404);
    const merged = {
        ...assignment.toObject(),
        ...payload,
        effectiveTo:
            payload.effectiveTo === ''
                ? null
                : (payload.effectiveTo ?? assignment.effectiveTo)
    };
    await validateAssignment(merged, id);
    Object.assign(assignment, merged, {
        segmentIndex: Number(merged.segmentIndex),
        assignedBy: userId
    });
    await assignment.save();
    return (await getAssignments({ employeeId: assignment.employeeId })).find(
        (entry) => String(entry._id) === String(assignment._id)
    );
};

const deleteAssignment = async (id) => {
    const assignment = await ShiftAssignment.findById(id);
    if (!assignment) throw new AppError('Shift assignment not found', 404);
    if (await Attendance.exists({ shiftAssignmentId: assignment._id })) {
        assignment.status = 'Inactive';
        await assignment.save();
        return { deactivated: true };
    }
    await assignment.deleteOne();
    return { deactivated: false };
};

const getAssignmentForDate = async (employeeId, shiftDate) => {
    const assignment = await ShiftAssignment.findOne({
        employeeId,
        status: 'Active',
        effectiveFrom: { $lte: shiftDate },
        $or: [
            { effectiveTo: null },
            { effectiveTo: '' },
            { effectiveTo: { $gte: shiftDate } }
        ]
    })
        .sort({ effectiveFrom: -1, createdAt: -1 })
        .populate('shiftId');

    if (
        !assignment ||
        !assignment.shiftId ||
        assignment.shiftId.status !== 'Active'
    ) {
        return null;
    }

    const dayOfWeek = new Date(`${shiftDate}T00:00:00.000Z`).getUTCDay();
    const workDays =
        assignment.workDays?.length > 0
            ? assignment.workDays
            : assignment.shiftId.workDays;
    if (!workDays.includes(dayOfWeek)) return null;

    const segment = assignment.shiftId.segments[assignment.segmentIndex];
    if (!segment) return null;
    const schedule = buildScheduleWindow(
        shiftDate,
        segment,
        assignment.shiftId.timezone
    );

    return {
        assignment,
        shift: assignment.shiftId,
        segment,
        schedule
    };
};

const previousDate = (dateValue) => {
    const date = new Date(`${dateValue}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
};

const getAssignmentForCheckIn = async (
    employeeId,
    requestedShiftDate,
    checkIn
) => {
    const current = await getAssignmentForDate(employeeId, requestedShiftDate);
    const priorShiftDate = previousDate(requestedShiftDate);
    const prior = await getAssignmentForDate(employeeId, priorShiftDate);

    if (
        prior?.schedule.overnight &&
        checkIn >= prior.schedule.scheduledStart &&
        checkIn <= prior.schedule.scheduledEnd
    ) {
        return { ...prior, shiftDate: priorShiftDate };
    }

    return current ? { ...current, shiftDate: requestedShiftDate } : null;
};

const getEmployeeSchedule = async (employeeId, shiftDate) => {
    const resolved = await getAssignmentForDate(employeeId, shiftDate);
    if (!resolved) return null;
    return {
        assignmentId: resolved.assignment._id,
        employeeId: resolved.assignment.employeeId,
        effectiveFrom: resolved.assignment.effectiveFrom,
        effectiveTo: resolved.assignment.effectiveTo,
        shift: serializeShift(resolved.shift),
        segmentIndex: resolved.assignment.segmentIndex,
        segment: {
            ...resolved.segment.toObject(),
            expectedMinutes: resolved.schedule.expectedMinutes,
            scheduledStart: resolved.schedule.scheduledStart,
            scheduledEnd: resolved.schedule.scheduledEnd,
            overnight: resolved.schedule.overnight
        }
    };
};

module.exports = {
    getShifts,
    createShift,
    updateShift,
    deleteShift,
    getAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentForDate,
    getAssignmentForCheckIn,
    getEmployeeSchedule
};
