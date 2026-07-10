const workflowService = require('./workflow.service');
const ApiResponse = require('../../shared/utils/response');

const success = (res, message, data, status = 200) =>
    ApiResponse.success(res, message, data, status);

const listWorkflows = async (req, res, next) => {
    try {
        const workflows = await workflowService.listWorkflows(req.query);
        return success(res, 'Workflows retrieved successfully', workflows);
    } catch (error) {
        next(error);
    }
};

const getWorkflow = async (req, res, next) => {
    try {
        const workflow = await workflowService.getWorkflowById(req.params.id);
        if (!workflow) {
            return res
                .status(404)
                .json({ success: false, message: 'Workflow not found' });
        }
        return success(
            res,
            'Workflow details retrieved successfully',
            workflow
        );
    } catch (error) {
        next(error);
    }
};

const createWorkflow = async (req, res, next) => {
    try {
        const workflow = await workflowService.createWorkflow(
            req.body,
            req.user.userId
        );
        return success(res, 'Workflow created successfully', workflow, 201);
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
        if (!workflow) {
            return res
                .status(404)
                .json({ success: false, message: 'Workflow not found' });
        }
        return success(res, 'Workflow updated successfully', workflow);
    } catch (error) {
        next(error);
    }
};

const deleteWorkflow = async (req, res, next) => {
    try {
        const workflow = await workflowService.deleteWorkflow(req.params.id);
        if (!workflow) {
            return res
                .status(404)
                .json({ success: false, message: 'Workflow not found' });
        }
        return success(res, 'Workflow deleted successfully', null);
    } catch (error) {
        next(error);
    }
};

const listLogs = async (req, res, next) => {
    try {
        const logs = await workflowService.listLogs(req.query);
        return success(
            res,
            'Workflow execution logs retrieved successfully',
            logs
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    listLogs
};
