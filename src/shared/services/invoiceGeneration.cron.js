const cron = require('node-cron');
const customerService = require('../../modules/customers/customer.service');
const logger = require('../utils/logger');

const runInvoiceGeneration = async () => {
    try {
        const generatedCount = await customerService.generateAllDueInvoices();
        logger.info(
            `[Invoice Generation Cron] Generated ${generatedCount} due invoice(s).`
        );
    } catch (error) {
        logger.error('[Invoice Generation Cron] Generation failed:', error);
    }
};

const scheduleInvoiceGeneration = () => {
    // Run daily at 00:05 IST. Stable schedule keys make retries idempotent.
    cron.schedule('5 0 * * *', runInvoiceGeneration, {
        timezone: 'Asia/Kolkata'
    });
    logger.info('[Invoice Generation Cron] Scheduled daily at 00:05 IST.');
};

module.exports = { runInvoiceGeneration, scheduleInvoiceGeneration };
