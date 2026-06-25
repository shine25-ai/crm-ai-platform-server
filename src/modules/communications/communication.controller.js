const communicationService = require('./communication.service');
const ApiResponse = require('../../shared/utils/response');

const success = (res, message, data, status = 200) =>
    ApiResponse.success(res, message, data, status);

const listEmailTemplates = async (req, res, next) => {
    try {
        return success(
            res,
            'Email templates retrieved successfully',
            await communicationService.listEmailTemplates(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const createEmailTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'Email template created successfully',
            await communicationService.createEmailTemplate(
                req.body,
                req.user.userId
            ),
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateEmailTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'Email template updated successfully',
            await communicationService.updateEmailTemplate(
                req.params.id,
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const deleteEmailTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'Email template deleted successfully',
            await communicationService.deleteEmailTemplate(req.params.id)
        );
    } catch (error) {
        next(error);
    }
};

const listWhatsappTemplates = async (req, res, next) => {
    try {
        return success(
            res,
            'WhatsApp templates retrieved successfully',
            await communicationService.listWhatsappTemplates(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const createWhatsappTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'WhatsApp template created successfully',
            await communicationService.createWhatsappTemplate(
                req.body,
                req.user.userId
            ),
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateWhatsappTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'WhatsApp template updated successfully',
            await communicationService.updateWhatsappTemplate(
                req.params.id,
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const deleteWhatsappTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'WhatsApp template deleted successfully',
            await communicationService.deleteWhatsappTemplate(req.params.id)
        );
    } catch (error) {
        next(error);
    }
};

const listEmailLogs = async (req, res, next) => {
    try {
        return success(
            res,
            'Email logs retrieved successfully',
            await communicationService.listEmailLogs(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const createEmailLog = async (req, res, next) => {
    try {
        return success(
            res,
            'Email log recorded successfully',
            await communicationService.createEmailLog(
                req.body,
                req.user.userId
            ),
            201
        );
    } catch (error) {
        next(error);
    }
};

const listWhatsappLogs = async (req, res, next) => {
    try {
        return success(
            res,
            'WhatsApp logs retrieved successfully',
            await communicationService.listWhatsappLogs(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const createWhatsappLog = async (req, res, next) => {
    try {
        return success(
            res,
            'WhatsApp log recorded successfully',
            await communicationService.createWhatsappLog(
                req.body,
                req.user.userId
            ),
            201
        );
    } catch (error) {
        next(error);
    }
};

const getTimeline = async (req, res, next) => {
    try {
        return success(
            res,
            'Communication timeline retrieved successfully',
            await communicationService.getCommunicationTimeline(
                req.query.relatedType,
                req.query.relatedId
            )
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    listWhatsappTemplates,
    createWhatsappTemplate,
    updateWhatsappTemplate,
    deleteWhatsappTemplate,
    listEmailLogs,
    createEmailLog,
    listWhatsappLogs,
    createWhatsappLog,
    getTimeline
};
