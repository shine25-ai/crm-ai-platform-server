const cron = require('node-cron');
const Task = require('../../modules/tasks/task.model');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');

/**
 * Daily cron — runs at 08:00 IST (02:30 UTC).
 * Finds all non-completed tasks whose due date falls within the next 24 hours
 * and sends a "Task Deadline Approaching" notification to each assignee.
 */
const scheduleTaskDeadlineReminders = () => {
    // '30 2 * * *'  =  02:30 UTC  =  08:00 IST
    cron.schedule('30 2 * * *', async () => {
        logger.info('[Task Deadline Cron] Running daily deadline check...');

        try {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Tasks due within the next 24 hours that are not yet completed/cancelled
            const tasks = await Task.find({
                dueDate: { $gte: now, $lte: in24h },
                status: { $nin: ['Completed', 'Cancelled'] },
                isDeleted: false
            }).select('_id title dueDate assignedTo');

            if (tasks.length === 0) {
                logger.info(
                    '[Task Deadline Cron] No upcoming deadlines found.'
                );
                return;
            }

            logger.info(
                `[Task Deadline Cron] Sending deadline reminders for ${tasks.length} task(s).`
            );

            await Promise.all(
                tasks.map((task) =>
                    notificationService.createNotification(
                        task.assignedTo,
                        'Task Deadline Approaching',
                        `"${task.title}" is due within the next 24 hours.`,
                        'Meeting Reminder',
                        {
                            referenceId: task._id,
                            referenceType: 'Task',
                            actionUrl: '/employee/dashboard?tab=tasks'
                        }
                    )
                )
            );

            logger.info(
                '[Task Deadline Cron] Deadline reminders sent successfully.'
            );
        } catch (error) {
            logger.error(
                '[Task Deadline Cron] Error sending deadline reminders:',
                error
            );
        }
    });

    logger.info('[Task Deadline Cron] Scheduled daily at 08:00 IST.');
};

module.exports = { scheduleTaskDeadlineReminders };
