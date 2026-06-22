const Workflow = require('./workflow.model');
const AppError = require('../../shared/utils/appError');

const listWorkflows = async (filters = {}) => {
    const query = {};
    if (filters.isActive !== undefined) {
        query.isActive =
            filters.isActive === 'true' || filters.isActive === true;
    }
    if (filters.requestType) {
        query.requestType = filters.requestType;
    }
    return Workflow.find(query).sort({ createdAt: -1 });
};

const getWorkflowById = async (id) => {
    const workflow = await Workflow.findById(id);
    if (!workflow) {
        throw new AppError('Workflow configuration not found', 404);
    }
    return workflow;
};

const createWorkflow = async (data) => {
    const existing = await Workflow.findOne({ requestType: data.requestType });
    if (existing) {
        throw new AppError(
            `A workflow configuration already exists for request type: ${data.requestType}`,
            400
        );
    }
    return await Workflow.create(data);
};

const updateWorkflow = async (id, data) => {
    const workflow = await Workflow.findById(id);
    if (!workflow) {
        throw new AppError('Workflow configuration not found', 404);
    }

    if (data.workflowName) workflow.workflowName = data.workflowName;
    if (data.isActive !== undefined) workflow.isActive = data.isActive;
    if (data.stages) workflow.stages = data.stages;

    await workflow.save();
    return workflow;
};

const deleteWorkflow = async (id) => {
    const workflow = await Workflow.findById(id);
    if (!workflow) {
        throw new AppError('Workflow configuration not found', 404);
    }
    workflow.isActive = false; // soft delete / disable
    await workflow.save();
    return workflow;
};

module.exports = {
    listWorkflows,
    getWorkflowById,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow
};
