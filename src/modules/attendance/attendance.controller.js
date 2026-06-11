const attendanceService = require('./attendance.service');
const ApiResponse = require('../../shared/utils/response');
const User = require('../users/user.model');
const Employee = require('../employees/employee.model');

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
        const { date, checkInTime } = req.body;
        if (!date || !checkInTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: date, checkInTime'
            });
        }
        const record = await attendanceService.checkIn(
            employeeId,
            date,
            checkInTime
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
        const { date, checkOutTime } = req.body;
        if (!date || !checkOutTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: date, checkOutTime'
            });
        }
        const record = await attendanceService.checkOut(
            employeeId,
            date,
            checkOutTime
        );
        return ApiResponse.success(res, 'Checked out successfully', record);
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
        const logs = await attendanceService.getLogsByEmployee(employeeId);
        return ApiResponse.success(
            res,
            'Attendance logs retrieved successfully',
            logs
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    checkIn,
    checkOut,
    getMyLogs
};
