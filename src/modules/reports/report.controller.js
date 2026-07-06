const reportService = require('./report.service');
const ApiResponse = require('../../shared/utils/response');

const getSalesReport = async (req, res, next) => {
    try {
        const data = await reportService.getSalesReport(req.query);
        return ApiResponse.success(
            res,
            'Sales report retrieved successfully',
            data
        );
    } catch (error) {
        next(error);
    }
};

const getLeadsReport = async (req, res, next) => {
    try {
        const data = await reportService.getLeadsReport(req.query);
        return ApiResponse.success(
            res,
            'Leads report retrieved successfully',
            data
        );
    } catch (error) {
        next(error);
    }
};

const getAttendanceReport = async (req, res, next) => {
    try {
        const data = await reportService.getAttendanceReport(req.query);
        return ApiResponse.success(
            res,
            'Attendance report retrieved successfully',
            data
        );
    } catch (error) {
        next(error);
    }
};

const getTasksReport = async (req, res, next) => {
    try {
        const data = await reportService.getTasksReport(req.query);
        return ApiResponse.success(
            res,
            'Tasks report retrieved successfully',
            data
        );
    } catch (error) {
        next(error);
    }
};

const getAssetsReport = async (req, res, next) => {
    try {
        const data = await reportService.getAssetsReport(req.query);
        return ApiResponse.success(
            res,
            'Assets report retrieved successfully',
            data
        );
    } catch (error) {
        next(error);
    }
};

const getAuditReport = async (req, res, next) => {
    try {
        const data = await reportService.getAuditReport(req.query);
        return ApiResponse.success(
            res,
            'Audit log report retrieved successfully',
            data
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSalesReport,
    getLeadsReport,
    getAttendanceReport,
    getTasksReport,
    getAssetsReport,
    getAuditReport
};
