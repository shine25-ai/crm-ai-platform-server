const approvalService = require('./approval.service');
const ApiResponse = require('../../shared/utils/response');

const getApprovals = async (req, res, next) => {
    try {
        const approvals = await approvalService.listApprovals(req.query);
        return ApiResponse.success(
            res,
            'Approvals retrieved successfully',
            approvals
        );
    } catch (error) {
        next(error);
    }
};

const createApproval = async (req, res, next) => {
    try {
        const approval = await approvalService.createApproval(
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Approval request created successfully',
            approval,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateApproval = async (req, res, next) => {
    try {
        const approval = await approvalService.updateApproval(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Approval request updated successfully',
            approval
        );
    } catch (error) {
        next(error);
    }
};

module.exports = { getApprovals, createApproval, updateApproval };
