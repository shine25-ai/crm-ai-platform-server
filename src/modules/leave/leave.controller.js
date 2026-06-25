const leaveService = require('./leave.service');
const ApiResponse = require('../../shared/utils/response');

const getPolicies = async (req, res, next) => {
    try {
        const policies = await leaveService.listPolicies(req.query);
        return ApiResponse.success(
            res,
            'Leave policies retrieved successfully',
            policies
        );
    } catch (error) {
        next(error);
    }
};

const savePolicy = async (req, res, next) => {
    try {
        const policy = await leaveService.upsertPolicy({
            ...req.body,
            _id: req.params.id
        });
        return ApiResponse.success(
            res,
            'Leave policy saved successfully',
            policy
        );
    } catch (error) {
        next(error);
    }
};

const previewLeave = async (req, res, next) => {
    try {
        const preview = await leaveService.previewLeaveRequest(
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Leave request preview calculated successfully',
            preview
        );
    } catch (error) {
        next(error);
    }
};

const getBalances = async (req, res, next) => {
    try {
        const balances = await leaveService.listBalances(req.query, req.user);
        return ApiResponse.success(
            res,
            'Leave balances retrieved successfully',
            balances
        );
    } catch (error) {
        next(error);
    }
};

const getMyBalances = async (req, res, next) => {
    try {
        const balances = await leaveService.getMyBalances(
            req.user,
            req.query.year
        );
        return ApiResponse.success(
            res,
            'My leave balances retrieved successfully',
            balances
        );
    } catch (error) {
        next(error);
    }
};

const adjustBalance = async (req, res, next) => {
    try {
        const balance = await leaveService.adjustBalance(req.body, req.user);
        return ApiResponse.success(
            res,
            'Leave balance adjusted successfully',
            balance
        );
    } catch (error) {
        next(error);
    }
};

const runCarryForward = async (req, res, next) => {
    try {
        const balances = await leaveService.runYearEndCarryForward(
            req.body.year,
            req.user
        );
        return ApiResponse.success(
            res,
            'Leave carry forward processed successfully',
            balances
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPolicies,
    savePolicy,
    previewLeave,
    getBalances,
    getMyBalances,
    adjustBalance,
    runCarryForward
};
