const aiService = require('../../shared/services/ai.service');
const AIConversation = require('./aiConversation.model');
const ApiResponse = require('../../shared/utils/response');

const success = (res, message, data, status = 200) =>
    ApiResponse.success(res, message, data, status);

const chat = async (req, res, next) => {
    try {
        const { contextModule, relatedId, prompt } = req.body;
        if (!contextModule || !prompt) {
            return res.status(400).json({
                success: false,
                message: 'contextModule and prompt are required'
            });
        }
        const result = await aiService.chat(
            req.user.userId,
            contextModule,
            relatedId,
            prompt
        );
        return success(res, 'Chat response generated successfully', result);
    } catch (error) {
        next(error);
    }
};

const generateLeadSummary = async (req, res, next) => {
    try {
        const { leadId } = req.body;
        if (!leadId) {
            return res
                .status(400)
                .json({ success: false, message: 'leadId is required' });
        }
        const result = await aiService.generateLeadSummary(
            req.user.userId,
            leadId
        );
        return success(res, 'Lead summary generated successfully', result);
    } catch (error) {
        next(error);
    }
};

const generateCustomerSummary = async (req, res, next) => {
    try {
        const { customerId } = req.body;
        if (!customerId) {
            return res
                .status(400)
                .json({ success: false, message: 'customerId is required' });
        }
        const result = await aiService.generateCustomerSummary(
            req.user.userId,
            customerId
        );
        return success(res, 'Customer summary generated successfully', result);
    } catch (error) {
        next(error);
    }
};

const generateTaskSummary = async (req, res, next) => {
    try {
        const { taskId } = req.body;
        if (!taskId) {
            return res
                .status(400)
                .json({ success: false, message: 'taskId is required' });
        }
        const result = await aiService.generateTaskSummary(
            req.user.userId,
            taskId
        );
        return success(res, 'Task summary generated successfully', result);
    } catch (error) {
        next(error);
    }
};

const generateReportSummary = async (req, res, next) => {
    try {
        const { reportType, reportData } = req.body;
        if (!reportType || !reportData) {
            return res.status(400).json({
                success: false,
                message: 'reportType and reportData are required'
            });
        }
        const result = await aiService.generateReportSummary(
            req.user.userId,
            reportType,
            reportData
        );
        return success(res, 'Report insights generated successfully', result);
    } catch (error) {
        next(error);
    }
};

const generateFollowupSuggestions = async (req, res, next) => {
    try {
        const { moduleType, entityId } = req.body;
        if (!moduleType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'moduleType and entityId are required'
            });
        }
        const result = await aiService.generateFollowupSuggestions(
            req.user.userId,
            moduleType,
            entityId
        );
        return success(
            res,
            'Follow-up suggestions generated successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const listConversations = async (req, res, next) => {
    try {
        const conversations = await AIConversation.find({
            userId: req.user.userId
        })
            .select('contextModule relatedId updatedAt')
            .sort({ updatedAt: -1 });
        return success(
            res,
            'Conversations list retrieved successfully',
            conversations
        );
    } catch (error) {
        next(error);
    }
};

const getConversation = async (req, res, next) => {
    try {
        const conversation = await AIConversation.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });
        if (!conversation) {
            return res
                .status(404)
                .json({ success: false, message: 'Conversation not found' });
        }
        return success(
            res,
            'Conversation details retrieved successfully',
            conversation
        );
    } catch (error) {
        next(error);
    }
};

const deleteConversation = async (req, res, next) => {
    try {
        const conversation = await AIConversation.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        });
        if (!conversation) {
            return res
                .status(404)
                .json({ success: false, message: 'Conversation not found' });
        }
        return success(res, 'Conversation deleted successfully', null);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    chat,
    generateLeadSummary,
    generateCustomerSummary,
    generateTaskSummary,
    generateReportSummary,
    generateFollowupSuggestions,
    listConversations,
    getConversation,
    deleteConversation
};
