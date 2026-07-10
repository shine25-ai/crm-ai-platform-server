const issueService = require('./issue.service');
const ApiResponse = require('../../shared/utils/response');

const createIssue = async (req, res, next) => {
    try {
        const issue = await issueService.createIssue(req.body, req.user.userId);
        return ApiResponse.success(
            res,
            'Issue logged successfully',
            issue,
            201
        );
    } catch (error) {
        next(error);
    }
};

const getIssues = async (req, res, next) => {
    try {
        const issues = await issueService.getIssues(req.query);
        return ApiResponse.success(
            res,
            'Issues retrieved successfully',
            issues
        );
    } catch (error) {
        next(error);
    }
};

const getIssueById = async (req, res, next) => {
    try {
        const issue = await issueService.getIssueById(req.params.id);
        return ApiResponse.success(
            res,
            'Issue details retrieved successfully',
            issue
        );
    } catch (error) {
        next(error);
    }
};

const updateIssue = async (req, res, next) => {
    try {
        const issue = await issueService.updateIssue(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(res, 'Issue updated successfully', issue);
    } catch (error) {
        next(error);
    }
};

const addComment = async (req, res, next) => {
    try {
        const issue = await issueService.addComment(
            req.params.id,
            req.body.comment,
            req.user.userId
        );
        return ApiResponse.success(res, 'Comment added successfully', issue);
    } catch (error) {
        next(error);
    }
};

const getIssueDashboard = async (req, res, next) => {
    try {
        const dashboard = await issueService.getIssueDashboard();
        return ApiResponse.success(
            res,
            'Issue dashboard metrics retrieved successfully',
            dashboard
        );
    } catch (error) {
        next(error);
    }
};

const getIssueReports = async (req, res, next) => {
    try {
        const reports = await issueService.getIssueReports(req.query);
        return ApiResponse.success(
            res,
            'Issue reports retrieved successfully',
            reports
        );
    } catch (error) {
        next(error);
    }
};

const escalateIssues = async (req, res, next) => {
    try {
        const result = await issueService.escalateIssues(req.user.userId);
        return ApiResponse.success(
            res,
            'Critical overdue issues checked and escalated',
            result
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createIssue,
    getIssues,
    getIssueById,
    updateIssue,
    addComment,
    getIssueDashboard,
    getIssueReports,
    escalateIssues
};
