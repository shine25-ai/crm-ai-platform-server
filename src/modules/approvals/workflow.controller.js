const workflowService = require('./workflow.service');
const ApiResponse = require('../../shared/utils/response');
const { validateCreateWorkflow } = require('./approval.validation');

const getWorkflows = async (req, res, next) => {
    try {
        const workflows = await workflowService.listWorkflows(req.query);
        return ApiResponse.success(
            res,
            'Workflows retrieved successfully',
            workflows
        );
    } catch (error) {
        next(error);
    }
};

const createWorkflow = async (req, res, next) => {
    try {
        validateCreateWorkflow(req.body);
        const workflow = await workflowService.createWorkflow(req.body);
        return ApiResponse.success(
            res,
            'Workflow created successfully',
            workflow,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateWorkflow = async (req, res, next) => {
    try {
        const workflow = await workflowService.updateWorkflow(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Workflow updated successfully',
            workflow
        );
    } catch (error) {
        next(error);
    }
};

const deleteWorkflow = async (req, res, next) => {
    try {
        const workflow = await workflowService.deleteWorkflow(req.params.id);
        return ApiResponse.success(
            res,
            'Workflow disabled successfully',
            workflow
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow
};
