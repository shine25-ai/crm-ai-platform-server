const Workflow = require('./workflow.model');
const AppError = require('../../shared/utils/appError');
const { validateCreateWorkflow } = require('./approval.validation');

const validateWorkflow = (data) => {
    validateCreateWorkflow(data);
    if (data.requestType === 'Leave Request' && data.stages.length !== 2) {
        throw new AppError(
            'Leave Request workflow must contain exactly Stage 1 and Stage 2',
            400
        );
    }
};

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
    validateWorkflow(data);
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

    validateWorkflow({
        workflowName: data.workflowName || workflow.workflowName,
        requestType: workflow.requestType,
        stages: data.stages || workflow.stages.map((stage) => stage.toObject())
    });

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
