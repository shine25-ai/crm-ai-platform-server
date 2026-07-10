const Timesheet = require('./timesheet.model');
const Employee = require('../employees/employee.model');
const Project = require('../projects/project.model');
const AppError = require('../../shared/utils/appError');

// Parse time string e.g. "09:30" to decimal hours
const timeToDecimal = (timeStr) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs + (mins || 0) / 60;
};

const createTimesheet = async (data, userId) => {
    const employee = await Employee.findOne({ userId });
    if (!employee)
        throw new AppError(
            'Only registered employees can submit timesheets.',
            400
        );

    let checkIn = data.startTime;
    let checkOut = data.endTime;
    let totalHours = data.totalHours;

    // Auto-calculate from shift/attendance if times are empty
    if (!checkIn || !checkOut) {
        const tsDate = new Date(data.date);
        const dateStr = tsDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Find attendance record
        const att = employee.attendance?.find((a) => a.date === dateStr);
        if (att && att.checkIn && att.checkOut) {
            checkIn = att.checkIn;
            checkOut = att.checkOut;
        }
    }

    // Compute total hours if times exist
    if (checkIn && checkOut && (!totalHours || totalHours === 0)) {
        const startDec = timeToDecimal(checkIn);
        const endDec = timeToDecimal(checkOut);
        if (endDec > startDec) {
            totalHours = Math.round((endDec - startDec) * 100) / 100;
        }
    }

    if (!totalHours || totalHours <= 0) {
        throw new AppError(
            'Timesheet hours must be positive. Check attendance check-in/out logs.',
            400
        );
    }

    const timesheet = await Timesheet.create({
        ...data,
        employee: employee._id,
        startTime: checkIn || '',
        endTime: checkOut || '',
        totalHours
    });

    return timesheet;
};

const getTimesheets = async (userId, roleCode, filters = {}) => {
    const query = {};
    const normRole = String(roleCode).toUpperCase();

    // If Employee: can only see their own timesheets
    if (normRole === 'EMPLOYEE') {
        const employee = await Employee.findOne({ userId });
        if (!employee) return [];
        query.employee = employee._id;
    } else {
        // PM / Admin filters
        if (filters.employee) query.employee = filters.employee;
    }

    if (filters.project) query.project = filters.project;
    if (filters.status) query.status = filters.status;
    if (filters.isBilled !== undefined) {
        query.isBilled =
            filters.isBilled === 'true' || filters.isBilled === true;
    }

    return Timesheet.find(query)
        .populate('employee', 'name email designation department')
        .populate('project', 'projectName')
        .populate('task', 'title')
        .sort({ date: -1 });
};

const updateTimesheet = async (id, data) => {
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) throw new AppError('Timesheet not found', 404);

    if (timesheet.status === 'Approved') {
        throw new AppError('Approved timesheets cannot be modified', 400);
    }

    let checkIn = data.startTime || timesheet.startTime;
    let checkOut = data.endTime || timesheet.endTime;
    let totalHours = data.totalHours;

    if (checkIn && checkOut && (!totalHours || totalHours === 0)) {
        const startDec = timeToDecimal(checkIn);
        const endDec = timeToDecimal(checkOut);
        if (endDec > startDec) {
            totalHours = Math.round((endDec - startDec) * 100) / 100;
        }
    }

    Object.assign(timesheet, {
        ...data,
        startTime: checkIn,
        endTime: checkOut,
        totalHours: totalHours || timesheet.totalHours
    });

    await timesheet.save();
    return timesheet;
};

const submitTimesheet = async (id) => {
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) throw new AppError('Timesheet not found', 404);

    timesheet.status = 'Submitted';
    timesheet.submittedAt = new Date();
    await timesheet.save();
    return timesheet;
};

const reviewTimesheet = async (id, reviewData, reviewerId) => {
    const timesheet = await Timesheet.findById(id);
    if (!timesheet) throw new AppError('Timesheet not found', 404);

    const { status, rejectionReason } = reviewData;
    if (!['Approved', 'Rejected'].includes(status)) {
        throw new AppError('Invalid approval status', 400);
    }

    timesheet.status = status;
    timesheet.approvedBy = reviewerId;
    timesheet.approvedAt = new Date();
    if (status === 'Rejected') {
        timesheet.rejectionReason =
            rejectionReason || 'Rejected by Project Manager';
    } else {
        timesheet.rejectionReason = '';
    }

    await timesheet.save();

    // Log Activity in Project
    const project = await Project.findById(timesheet.project);
    if (project) {
        project.activityHistory.push({
            action: `Timesheet ${status}`,
            details: `Timesheet entry for date ${new Date(timesheet.date).toLocaleDateString()} was ${status.toLowerCase()}.`,
            performedBy: reviewerId
        });
        await project.save();
    }

    return timesheet;
};

const getTimesheetReports = async (filters = {}) => {
    const query = {};
    if (filters.project) query.project = filters.project;
    if (filters.employee) query.employee = filters.employee;

    const timesheets = await Timesheet.find(query)
        .populate('employee', 'name department')
        .populate('project', 'projectName');

    // 1. Employee-wise Hours
    const employeeHours = {};
    // 2. Project-wise Hours
    const projectHours = {};
    // 3. Billable vs Non-billable
    let billableHours = 0;
    let nonBillableHours = 0;
    // 4. Pending approvals count
    let pendingApprovals = 0;

    timesheets.forEach((ts) => {
        const empName = ts.employee?.name || 'Unassigned';
        const projName = ts.project?.projectName || 'General';

        if (ts.status === 'Approved') {
            employeeHours[empName] =
                (employeeHours[empName] || 0) + ts.totalHours;
            projectHours[projName] =
                (projectHours[projName] || 0) + ts.totalHours;

            if (ts.billingType === 'Billable') {
                billableHours += ts.totalHours;
            } else {
                nonBillableHours += ts.totalHours;
            }
        }

        if (ts.status === 'Submitted') {
            pendingApprovals++;
        }
    });

    const formatObjToChart = (obj, labelKey, valueKey) =>
        Object.keys(obj).map((key) => ({
            [labelKey]: key,
            [valueKey]: Math.round(obj[key] * 100) / 100
        }));

    return {
        employeeHours: formatObjToChart(employeeHours, 'employee', 'hours'),
        projectHours: formatObjToChart(projectHours, 'project', 'hours'),
        billableHours,
        nonBillableHours,
        pendingApprovals
    };
};

module.exports = {
    createTimesheet,
    getTimesheets,
    updateTimesheet,
    submitTimesheet,
    reviewTimesheet,
    getTimesheetReports
};
