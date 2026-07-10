const timesheetService = require('./timesheet.service');
const ApiResponse = require('../../shared/utils/response');

const createTimesheet = async (req, res, next) => {
    try {
        const timesheet = await timesheetService.createTimesheet(
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Timesheet entry created successfully',
            timesheet,
            201
        );
    } catch (error) {
        next(error);
    }
};

const getTimesheets = async (req, res, next) => {
    try {
        const timesheets = await timesheetService.getTimesheets(
            req.user.userId,
            req.user.roleCode,
            req.query
        );
        return ApiResponse.success(
            res,
            'Timesheets retrieved successfully',
            timesheets
        );
    } catch (error) {
        next(error);
    }
};

const updateTimesheet = async (req, res, next) => {
    try {
        const timesheet = await timesheetService.updateTimesheet(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Timesheet entry updated successfully',
            timesheet
        );
    } catch (error) {
        next(error);
    }
};

const submitTimesheet = async (req, res, next) => {
    try {
        const timesheet = await timesheetService.submitTimesheet(req.params.id);
        return ApiResponse.success(
            res,
            'Timesheet submitted successfully for approval',
            timesheet
        );
    } catch (error) {
        next(error);
    }
};

const reviewTimesheet = async (req, res, next) => {
    try {
        const timesheet = await timesheetService.reviewTimesheet(
            req.params.id,
            req.body,
            req.user.userId
        );
        const msg =
            req.body.status === 'Approved'
                ? 'Timesheet approved'
                : 'Timesheet rejected';
        return ApiResponse.success(res, msg, timesheet);
    } catch (error) {
        next(error);
    }
};

const getTimesheetReports = async (req, res, next) => {
    try {
        const reports = await timesheetService.getTimesheetReports(req.query);
        return ApiResponse.success(
            res,
            'Timesheet reports retrieved successfully',
            reports
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTimesheet,
    getTimesheets,
    updateTimesheet,
    submitTimesheet,
    reviewTimesheet,
    getTimesheetReports
};
