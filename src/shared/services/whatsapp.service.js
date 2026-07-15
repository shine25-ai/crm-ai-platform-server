const crypto = require('crypto');
const {
    WhatsAppLog,
    CommunicationSetting
} = require('../../modules/communications/communication.model');
const logger = require('../utils/logger');

/**
 * Simulates sending a WhatsApp message and logs it to the database
 */
const sendWhatsAppMessage = async (recipient, body, options = {}) => {
    const {
        templateId = null,
        templateName = '',
        relatedType = null,
        relatedId = null,
        createdBy = null
    } = options;

    logger.info(
        `[WhatsApp Service] Preparing message to ${recipient}: "${body.substring(0, 60)}..."`
    );

    // Fetch configurations (mock check or validation)
    const settings = await CommunicationSetting.findOne({ key: 'default' });
    const isEnabled = settings?.whatsapp?.enabled || false;

    // Generate simulated provider message ID
    const providerMessageId = `wa_msg_${crypto.randomUUID()}`;

    // Create the initial log entry (Sent status)
    const log = new WhatsAppLog({
        templateId,
        templateName,
        recipient,
        body,
        providerMessageId,
        deliveryStatus: 'Sent',
        readStatus: 'Unknown',
        relatedType,
        relatedLead: relatedType === 'Lead' ? relatedId : null,
        relatedCustomer: relatedType === 'Customer' ? relatedId : null,
        createdBy
    });

    await log.save();

    // Trigger simulated background status updates
    setTimeout(async () => {
        try {
            const currentLog = await WhatsAppLog.findById(log._id);
            if (currentLog) {
                currentLog.deliveryStatus = 'Delivered';
                currentLog.readStatus = 'Unread';
                await currentLog.save();
                logger.info(
                    `[WhatsApp Service] Status webhook: Message ${providerMessageId} to ${recipient} DELIVERED`
                );
            }
        } catch (err) {
            logger.error(
                `[WhatsApp Service] Delivery webhook simulation failed: ${err.message}`
            );
        }
    }, 1500);

    return {
        success: true,
        logId: log._id,
        providerMessageId,
        status: 'Sent'
    };
};

module.exports = {
    sendWhatsAppMessage
};
