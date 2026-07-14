const mongoose = require('mongoose');
const axios = require('axios');
const Workflow = require('./workflow.model');
const WorkflowLog = require('./workflowLog.model');
const Task = require('../tasks/task.model');
const Approval = require('../approvals/approval.model');
const emailService = require('../../shared/services/email.service');
const whatsappService = require('../../shared/services/whatsapp.service');
const notificationService = require('../notifications/notification.service');
const logger = require('../../shared/utils/logger');

// Condition matcher logic helper
const evaluateCondition = (record, condition) => {
    const val = record[condition.field];
    if (val === undefined || val === null) return false;

    const condVal = condition.value;

    switch (condition.operator) {
        case 'equals':
            return String(val).toLowerCase() === String(condVal).toLowerCase();
        case 'not_equals':
            return String(val).toLowerCase() !== String(condVal).toLowerCase();
        case 'greater_than':
            return Number(val) > Number(condVal);
        case 'less_than':
            return Number(val) < Number(condVal);
        case 'contains':
            return String(val)
                .toLowerCase()
                .includes(String(condVal).toLowerCase());
        default:
            return false;
    }
};

// Variable placeholder resolver helper: e.g. "Hi {{firstName}}"
const resolvePlaceholders = (templateStr, record) => {
    if (!templateStr || typeof templateStr !== 'string') return templateStr;
    return templateStr.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        return record[trimmedKey] !== undefined ? record[trimmedKey] : match;
    });
};

// Executes a single workflow action
const executeAction = async (action, data, createdBy) => {
    logger.info(`[Workflow Engine] Executing action type: ${action.type}`);

    switch (action.type) {
        case 'create_task': {
            const title = resolvePlaceholders(action.params.title, data);
            const description = resolvePlaceholders(
                action.params.description,
                data
            );
            const priority = action.params.priority || 'Medium';
            const assignedTo = action.params.assignedTo || createdBy;

            await Task.create({
                title,
                description,
                priority,
                assignedTo,
                status: 'Todo',
                createdBy
            });
            break;
        }
        case 'update_record': {
            if (data._id && data.constructor && data.constructor.modelName) {
                const Model = mongoose.model(data.constructor.modelName);
                const updates = {};
                for (const [k, v] of Object.entries(action.params)) {
                    updates[k] =
                        typeof v === 'string'
                            ? resolvePlaceholders(v, data)
                            : v;
                }
                await Model.findByIdAndUpdate(data._id, updates, { new: true });
            }
            break;
        }
        case 'send_email': {
            const recipient = resolvePlaceholders(
                action.params.recipient,
                data
            );
            let subject = action.params.subject;
            let body = action.params.bodyHtml || action.params.body;

            if (action.params.templateId) {
                try {
                    const {
                        EmailTemplate
                    } = require('../communications/communication.model');
                    const template = await EmailTemplate.findById(
                        action.params.templateId
                    );
                    if (template) {
                        subject = template.subject;
                        body = template.body;
                    }
                } catch (err) {
                    logger.error(
                        `[Workflow Engine] Error loading EmailTemplate ${action.params.templateId}: ${err.message}`
                    );
                }
            }

            const resolvedSubject = resolvePlaceholders(subject, data);
            const resolvedHtml = resolvePlaceholders(body, data);
            await emailService.sendCustomEmail(
                recipient,
                resolvedSubject,
                resolvedHtml
            );
            break;
        }
        case 'send_whatsapp': {
            const recipient = resolvePlaceholders(
                action.params.recipient,
                data
            );
            let body = action.params.body;
            let templateName = action.params.templateName || 'workflow_alert';

            if (action.params.templateId) {
                try {
                    const {
                        WhatsAppTemplate
                    } = require('../communications/communication.model');
                    const template = await WhatsAppTemplate.findById(
                        action.params.templateId
                    );
                    if (template) {
                        body = template.body;
                        templateName =
                            template.metaTemplateName || template.name;
                    }
                } catch (err) {
                    logger.error(
                        `[Workflow Engine] Error loading WhatsAppTemplate ${action.params.templateId}: ${err.message}`
                    );
                }
            }

            const resolvedBody = resolvePlaceholders(body, data);
            await whatsappService.sendWhatsAppMessage(recipient, resolvedBody, {
                templateName,
                createdBy
            });
            break;
        }
        case 'send_notification': {
            const userId = action.params.userId || createdBy;
            const title = resolvePlaceholders(action.params.title, data);
            const message = resolvePlaceholders(action.params.message, data);
            await notificationService.createNotification(
                userId,
                title,
                message,
                'System'
            );
            break;
        }
        case 'create_approval': {
            const requestType = action.params.requestType || 'Leave Request';
            const requester = action.params.requesterId || createdBy;
            const title = resolvePlaceholders(action.params.title, data);

            await Approval.create({
                requestType,
                requester,
                title,
                status: 'Pending',
                createdBy
            });
            break;
        }
        case 'call_webhook': {
            const url = action.params.url;
            if (url) {
                await axios.post(url, data);
            }
            break;
        }
        default:
            throw new Error(`Unsupported action type: ${action.type}`);
    }
};

/**
 * Triggers workflow checks for a given business event
 */
const trigger = async (eventName, data) => {
    logger.info(`[Workflow Engine] Triggered event check for: ${eventName}`);

    // Load active workflows matching the trigger event name
    const workflows = await Workflow.find({
        triggerEvent: eventName,
        status: 'Active'
    });
    if (!workflows.length) return;

    for (const workflow of workflows) {
        let matches = true;

        // Evaluate all custom filter conditions
        if (workflow.conditions && workflow.conditions.length > 0) {
            for (const cond of workflow.conditions) {
                if (!evaluateCondition(data, cond)) {
                    matches = false;
                    break;
                }
            }
        }

        if (!matches) {
            logger.info(
                `[Workflow Engine] Conditions not met for workflow: ${workflow.name}`
            );
            continue;
        }

        logger.info(
            `[Workflow Engine] Running matching workflow: ${workflow.name}`
        );
        const executedActions = [];
        let workflowStatus = 'Success';

        // Execute stack of actions sequentially
        for (const action of workflow.actions) {
            const start = Date.now();
            try {
                await executeAction(action, data, workflow.createdBy);
                executedActions.push({
                    actionType: action.type,
                    status: 'Success',
                    durationMs: Date.now() - start
                });
            } catch (err) {
                logger.error(
                    `[Workflow Engine] Failed executing action ${action.type}: ${err.message}`
                );
                executedActions.push({
                    actionType: action.type,
                    status: 'Failed',
                    error: err.message,
                    durationMs: Date.now() - start
                });
                workflowStatus = 'Failed';
            }
        }

        // Save execution audit log
        await WorkflowLog.create({
            workflowId: workflow._id,
            triggerEvent: eventName,
            matchedConditions: true,
            executedActions,
            status: workflowStatus
        });
    }
};

const listWorkflows = async (query = {}) => {
    return Workflow.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

const getWorkflowById = async (id) => {
    return Workflow.findById(id).populate('createdBy', 'firstName lastName');
};

const createWorkflow = async (data, userId) => {
    return Workflow.create({ ...data, createdBy: userId });
};

const updateWorkflow = async (id, data) => {
    return Workflow.findByIdAndUpdate(id, data, { new: true });
};

const deleteWorkflow = async (id) => {
    return Workflow.findByIdAndDelete(id);
};

const listLogs = async (query = {}) => {
    return WorkflowLog.find(query)
        .populate('workflowId', 'name')
        .sort({ timestamp: -1 });
};

module.exports = {
    trigger,
    listWorkflows,
    getWorkflowById,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    listLogs
};
