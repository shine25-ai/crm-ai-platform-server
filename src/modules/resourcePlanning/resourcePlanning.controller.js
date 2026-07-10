const resourcePlanningService = require('./resourcePlanning.service');
const ApiResponse = require('../../shared/utils/response');

const getAllocations = async (req, res, next) => {
    try {
        const allocations = await resourcePlanningService.getAllocations(
            req.query
        );
        return ApiResponse.success(
            res,
            'Allocations retrieved successfully',
            allocations
        );
    } catch (error) {
        next(error);
    }
};

const getResourcesWorkload = async (req, res, next) => {
    try {
        const workloads = await resourcePlanningService.getResourcesWorkload(
            req.query
        );
        return ApiResponse.success(
            res,
            'Resource workloads retrieved successfully',
            workloads
        );
    } catch (error) {
        next(error);
    }
};

const createAllocation = async (req, res, next) => {
    try {
        const allocation = await resourcePlanningService.createAllocation(
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Allocation created successfully',
            allocation,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateAllocation = async (req, res, next) => {
    try {
        const allocation = await resourcePlanningService.updateAllocation(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Allocation updated successfully',
            allocation
        );
    } catch (error) {
        next(error);
    }
};

const deleteAllocation = async (req, res, next) => {
    try {
        const result = await resourcePlanningService.deleteAllocation(
            req.params.id,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Allocation deleted successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const getCalendarView = async (req, res, next) => {
    try {
        const calendar = await resourcePlanningService.getCalendarView();
        return ApiResponse.success(
            res,
            'Resource calendar retrieved successfully',
            calendar
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllocations,
    getResourcesWorkload,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    getCalendarView
};
