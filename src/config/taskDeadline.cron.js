const cron = require('node-cron');
const Task = require('../modules/tasks/task.model');
const notificationService = require('../modules/notifications/notification.service');

/**
 * Runs every day at 8:00 AM.
 * Finds tasks due within the next 24 hours and sends a reminder notification
 * to the assigned employee.
 */
const taskDeadlineCron = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log('[Cron] Running task deadline reminder check...');
        try {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const tasks = await Task.find({
                isDeleted: false,
                status: { $nin: ['Completed', 'Cancelled'] },
                dueDate: { $gte: now, $lte: in24h }
            });

            console.log(`[Cron] Found ${tasks.length} task(s) due within 24h.`);

            for (const task of tasks) {
                const dueStr = new Date(task.dueDate).toLocaleDateString(
                    'en-IN',
                    { day: '2-digit', month: 'short', year: 'numeric' }
                );
                await notificationService.createNotification(
                    task.assignedTo,
                    'Task Due Soon',
                    `"${task.title}" is due on ${dueStr}. Please complete it on time.`,
                    'System',
                    {
                        referenceId: task._id,
                        referenceType: 'Task',
                        actionUrl: '/employee/dashboard?tab=tasks'
                    }
                );
            }
        } catch (err) {
            console.error('[Cron] Task deadline cron error:', err.message);
        }
    });

    console.log('[Cron] Task deadline reminder scheduled at 8:00 AM daily.');
};

module.exports = taskDeadlineCron;
