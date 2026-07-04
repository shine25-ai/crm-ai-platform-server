const shiftService = require('./shift.service');
const ApiResponse = require('../../shared/utils/response');
const User = require('../users/user.model');
const Employee = require('../employees/employee.model');
const AppError = require('../../shared/utils/appError');

const resolveEmployeeId = async (req) => {
    if (req.user?.employeeId) return req.user.employeeId;
    const user = await User.findById(req.user?.userId);
    if (user?.employeeId) return user.employeeId;
    if (user?.email) {
        const employee = await Employee.findOne({ email: user.email });
        if (employee) return employee._id;
    }
    return null;
};

const list = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Shift Masters retrieved successfully',
            await shiftService.getShifts(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Shift Master created successfully',
            await shiftService.createShift(req.body, req.user.userId),
            201
        );
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Shift Master updated successfully',
            await shiftService.updateShift(
                req.params.id,
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        await shiftService.deleteShift(req.params.id);
        return ApiResponse.success(res, 'Shift Master deleted successfully');
    } catch (error) {
        next(error);
    }
};

const listAssignments = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Shift assignments retrieved successfully',
            await shiftService.getAssignments(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const createAssignment = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Shift assigned successfully',
            await shiftService.createAssignment(req.body, req.user.userId),
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateAssignment = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Shift assignment updated successfully',
            await shiftService.updateAssignment(
                req.params.id,
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const removeAssignment = async (req, res, next) => {
    try {
        const result = await shiftService.deleteAssignment(req.params.id);
        return ApiResponse.success(
            res,
            result.deactivated
                ? 'Shift assignment deactivated to preserve timesheet history'
                : 'Shift assignment deleted successfully'
        );
    } catch (error) {
        next(error);
    }
};

const mySchedule = async (req, res, next) => {
    try {
        const employeeId = await resolveEmployeeId(req);
        if (!employeeId) throw new AppError('Employee profile not found', 404);
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        return ApiResponse.success(
            res,
            'Employee schedule retrieved successfully',
            await shiftService.getEmployeeSchedule(employeeId, date)
        );
    } catch (error) {
        next(error);
    }
};

const employeeSchedule = async (req, res, next) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        return ApiResponse.success(
            res,
            'Employee schedule retrieved successfully',
            await shiftService.getEmployeeSchedule(req.params.employeeId, date)
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    list,
    create,
    update,
    remove,
    listAssignments,
    createAssignment,
    updateAssignment,
    removeAssignment,
    mySchedule,
    employeeSchedule
};
