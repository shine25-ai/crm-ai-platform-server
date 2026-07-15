const communicationService = require('./communication.service');
const ApiResponse = require('../../shared/utils/response');

const success = (res, message, data, status = 200) =>
    ApiResponse.success(res, message, data, status);

const verifyWhatsappWebhook = async (req, res, next) => {
    try {
        const challenge = await communicationService.verifyWhatsappWebhook({
            mode: req.query['hub.mode'],
            token: req.query['hub.verify_token'],
            challenge: req.query['hub.challenge']
        });
        return res.status(200).send(challenge);
    } catch (error) {
        next(error);
    }
};

const receiveWhatsappWebhook = async (req, res, next) => {
    try {
        await communicationService.handleWhatsappWebhook(req.body);
        return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        next(error);
    }
};

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

const listInvoiceTemplates = async (req, res, next) => {
    try {
        return success(
            res,
            'Invoice templates retrieved successfully',
            await communicationService.listInvoiceTemplates(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const createInvoiceTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'Invoice template created successfully',
            await communicationService.createInvoiceTemplate(
                req.body,
                req.user.userId
            ),
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateInvoiceTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'Invoice template updated successfully',
            await communicationService.updateInvoiceTemplate(
                req.params.id,
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const deleteInvoiceTemplate = async (req, res, next) => {
    try {
        return success(
            res,
            'Invoice template deleted successfully',
            await communicationService.deleteInvoiceTemplate(req.params.id)
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

const getSettings = async (req, res, next) => {
    try {
        return success(
            res,
            'Communication settings retrieved successfully',
            await communicationService.getCommunicationSettings()
        );
    } catch (error) {
        next(error);
    }
};

const updateSettings = async (req, res, next) => {
    try {
        return success(
            res,
            'Communication settings updated successfully',
            await communicationService.updateCommunicationSettings(
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const testSettings = async (req, res, next) => {
    try {
        return success(
            res,
            'Provider connection verified successfully',
            await communicationService.testCommunicationSettings(
                req.body.channel
            )
        );
    } catch (error) {
        next(error);
    }
};

const refreshWhatsappToken = async (req, res, next) => {
    try {
        return success(
            res,
            'WhatsApp access token refreshed successfully',
            await communicationService.refreshWhatsappAccessToken()
        );
    } catch (error) {
        next(error);
    }
};

const sendCommunication = async (req, res, next) => {
    try {
        return success(
            res,
            'Message sent successfully',
            await communicationService.sendCommunication(
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

const syncConnectionHealth = async (req, res, next) => {
    try {
        return success(
            res,
            'Connection health synchronized successfully',
            await communicationService.syncConnectionHealth()
        );
    } catch (error) {
        next(error);
    }
};

const sendBulkCampaign = async (req, res, next) => {
    try {
        return success(
            res,
            'Bulk campaign dispatched successfully',
            await communicationService.sendBulkCampaign(
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    verifyWhatsappWebhook,
    receiveWhatsappWebhook,
    listEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    listWhatsappTemplates,
    createWhatsappTemplate,
    updateWhatsappTemplate,
    deleteWhatsappTemplate,
    listInvoiceTemplates,
    createInvoiceTemplate,
    updateInvoiceTemplate,
    deleteInvoiceTemplate,
    listEmailLogs,
    createEmailLog,
    listWhatsappLogs,
    createWhatsappLog,
    getSettings,
    updateSettings,
    testSettings,
    refreshWhatsappToken,
    sendCommunication,
    getTimeline,
    syncConnectionHealth,
    sendBulkCampaign
};
