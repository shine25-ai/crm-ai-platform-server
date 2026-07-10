const cron = require('node-cron');
const AutomationJob = require('./automationJob.model');
const automationService = require('./automation.service');
const logger = require('../../shared/utils/logger');

/**
 * Initializes background cron schedule dispatcher
 */
const init = () => {
    logger.info(
        '[Automation Runner] Initializing background scheduler check loop...'
    );

    // Run query check every minute
    cron.schedule('*/1 * * * *', async () => {
        try {
            const now = new Date();
            // Load active jobs whose nextRun dates are due
            const activeJobs = await AutomationJob.find({
                status: 'Active',
                nextRun: { $lte: now }
            });

            if (activeJobs.length > 0) {
                logger.info(
                    `[Automation Runner] Found ${activeJobs.length} active scheduled jobs to execute.`
                );
                for (const job of activeJobs) {
                    await automationService.runJob(job);
                }
            }
        } catch (err) {
            logger.error(
                `[Automation Runner] Background tick execution failed: ${err.message}`
            );
        }
    });
};

module.exports = { init };
