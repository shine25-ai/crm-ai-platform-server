const cron = require('node-cron');
const LeadFollowUp = require('../../modules/leads/leadFollowUp.model');
const Lead = require('../../modules/leads/lead.model');
const notificationService = require('../../modules/notifications/notification.service');
const logger = require('../utils/logger');

/**
 * Daily cron — runs at 08:30 IST (03:00 UTC).
 * Finds all Scheduled lead follow-ups due today and sends a notification.
 */
const scheduleLeadFollowUpReminders = () => {
    // '0 3 * * *' = 03:00 UTC = 08:30 IST
    cron.schedule('0 3 * * *', async () => {
        logger.info('[Lead Follow-Up Cron] Running daily follow-up check...');

        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const followUps = await LeadFollowUp.find({
                followUpDate: { $gte: startOfDay, $lte: endOfDay },
                status: 'Scheduled'
            }).populate('leadId');

            if (followUps.length === 0) {
                logger.info(
                    '[Lead Follow-Up Cron] No follow-ups scheduled for today.'
                );
                return;
            }

            logger.info(
                `[Lead Follow-Up Cron] Found ${followUps.length} follow-up(s) due today.`
            );

            await Promise.all(
                followUps.map(async (followUp) => {
                    const leadObj = followUp.leadId;
                    if (!leadObj) return;

                    const recipient = leadObj.assignedTo || followUp.createdBy;
                    if (!recipient) return;

                    await notificationService.createNotification(
                        recipient,
                        'Lead Follow-Up Due',
                        `Follow-up of type "${followUp.type}" is due today for lead "${leadObj.name}".`,
                        'System',
                        {
                            referenceId: leadObj._id,
                            referenceType: 'System',
                            actionUrl: `/leads/${leadObj._id}`
                        }
                    );
                })
            );

            logger.info(
                '[Lead Follow-Up Cron] Lead follow-up reminders sent successfully.'
            );
        } catch (error) {
            logger.error(
                '[Lead Follow-Up Cron] Error sending follow-up reminders:',
                error
            );
        }
    });

    logger.info('[Lead Follow-Up Cron] Scheduled daily at 08:30 IST.');
};

module.exports = { scheduleLeadFollowUpReminders };
