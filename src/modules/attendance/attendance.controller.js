const attendanceService = require('./attendance.service');
const ApiResponse = require('../../shared/utils/response');
const User = require('../users/user.model');
const Employee = require('../employees/employee.model');

const canViewAllAttendance = (req) =>
    ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user?.roleCode);

/**
 * Resolve employeeId dynamically from request session or database record
 */
const resolveEmployeeId = async (req) => {
    // 1. Check if employeeId is directly in the decoded JWT token
    if (req.user && req.user.employeeId) {
        return req.user.employeeId;
    }

    // 2. Fetch the user document from database to get their linked employeeId
    if (req.user && req.user.userId) {
        const user = await User.findById(req.user.userId);
        if (user && user.employeeId) {
            return user.employeeId;
        }

        // 3. Fallback: Check if there is an Employee profile matching the user's email
        if (user && user.email) {
            const employee = await Employee.findOne({ email: user.email });
            if (employee) {
                return employee._id;
            }
        }

        // 4. Fallback: If no employee record exists at all (e.g. default admin),
        // use their userId as employeeId so checking in never fails.
        return user._id;
    }

    return null;
};

/**
 * Handle Employee Check-In Request
 */
const checkIn = async (req, res, next) => {
    try {
        const employeeId = await resolveEmployeeId(req);
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Could not resolve a valid Employee profile or User ID'
            });
        }
        const { date, shiftDate, checkInTime, location } = req.body;
        const attendanceDate = shiftDate || date;
        if (!attendanceDate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: shiftDate'
            });
        }
        const record = await attendanceService.checkIn(
            employeeId,
            attendanceDate,
            checkInTime,
            location,
            req.user.userId
        );
        return ApiResponse.success(res, 'Checked in successfully', record, 201);
    } catch (error) {
        next(error);
    }
};

/**
 * Handle Employee Check-Out Request
 */
const checkOut = async (req, res, next) => {
    try {
        const employeeId = await resolveEmployeeId(req);
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Could not resolve a valid Employee profile or User ID'
            });
        }
        const { date, shiftDate, checkOutTime } = req.body;
        const record = await attendanceService.checkOut(
            employeeId,
            shiftDate || date,
            checkOutTime,
            req.user.userId
        );
        return ApiResponse.success(res, 'Checked out successfully', record);
    } catch (error) {
        next(error);
    }
};

const breakStart = async (req, res, next) => {
    try {
        const employeeId = await resolveEmployeeId(req);
        const record = await attendanceService.breakStart(
            employeeId,
            req.user.userId
        );
        return ApiResponse.success(res, 'Break started successfully', record);
    } catch (error) {
        next(error);
    }
};

const breakEnd = async (req, res, next) => {
    try {
        const employeeId = await resolveEmployeeId(req);
        const record = await attendanceService.breakEnd(
            employeeId,
            req.user.userId
        );
        return ApiResponse.success(res, 'Break ended successfully', record);
    } catch (error) {
        next(error);
    }
};

/**
 * Handle Retrieve Logged-in Employee Logs Request
 */
const getMyLogs = async (req, res, next) => {
    try {
        const employeeId = await resolveEmployeeId(req);
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Could not resolve a valid Employee profile or User ID'
            });
        }
        const logs = await attendanceService.getLogsByEmployee(
            employeeId,
            req.query
        );
        return ApiResponse.success(
            res,
            'Attendance logs retrieved successfully',
            logs
        );
    } catch (error) {
        next(error);
    }
};

const getHistory = async (req, res, next) => {
    try {
        const employeeId = canViewAllAttendance(req)
            ? req.query.employeeId || null
            : await resolveEmployeeId(req);

        const logs = await attendanceService.getLogsByEmployee(
            employeeId,
            req.query
        );

        return ApiResponse.success(
            res,
            'Attendance history retrieved successfully',
            logs
        );
    } catch (error) {
        next(error);
    }
};

const getMonthlyReport = async (req, res, next) => {
    try {
        const employeeId = canViewAllAttendance(req)
            ? req.query.employeeId || null
            : await resolveEmployeeId(req);
        const report = await attendanceService.getMonthlyReport(
            employeeId,
            req.query.month,
            req.query.year,
            req.query
        );
        return ApiResponse.success(
            res,
            'Monthly attendance report retrieved successfully',
            report
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    checkIn,
    checkOut,
    breakStart,
    breakEnd,
    getMyLogs,
    getHistory,
    getMonthlyReport
};
