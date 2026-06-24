const cron = require('node-cron');
const approvalService = require('../../modules/approvals/approval.service');
const logger = require('../utils/logger');

/**
 * Daily cron — runs at 08:30 IST (03:00 UTC).
 * Finds pending approvals that have breached the SLA window defined in the workflow configuration
 * and escalates them to the supervisor or default queue.
 */
const scheduleApprovalEscalations = () => {
    // '0 3 * * *'  =  03:00 UTC  =  08:30 IST
    cron.schedule('0 3 * * *', async () => {
        logger.info('[Approval SLA Cron] Running daily escalation check...');
        try {
            await approvalService.runSlaEscalations();
            logger.info(
                '[Approval SLA Cron] SLA escalations check completed successfully.'
            );
        } catch (error) {
            logger.error(
                '[Approval SLA Cron] Error in SLA escalations:',
                error
            );
        }
    });

    logger.info('[Approval SLA Cron] Scheduled daily at 08:30 IST.');
};

module.exports = { scheduleApprovalEscalations };
