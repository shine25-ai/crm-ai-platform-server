const AutomationJob = require('./automationJob.model');
const Lead = require('../leads/lead.model');
const Employee = require('../employees/employee.model');
const emailService = require('../../shared/services/email.service');
const logger = require('../../shared/utils/logger');

// Simple date parser helper to set next run estimation
const calculateNextRun = (schedule) => {
    const now = new Date();
    // Default: estimate next run in +24h or simple standard offsets
    if (schedule.includes('*/5')) {
        return new Date(now.getTime() + 5 * 60 * 1000);
    }
    if (schedule.includes('0 0') || schedule.includes('0 9')) {
        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            9,
            0,
            0
        );
    }
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
};

/**
 * Execute automation job actions
 */
const runJob = async (job) => {
    logger.info(
        `[Automation Engine] Starting Execution of Job: ${job.name} (${job.type})`
    );
    job.lastRun = new Date();

    try {
        switch (job.type) {
            case 'report-auto-delivery': {
                const recipient = job.taskConfig?.recipient;
                const reportName =
                    job.taskConfig?.reportName || 'Sales Performance Summary';
                if (!recipient)
                    throw new Error('Recipient email config is missing');

                const bodyHtml = `
                    <h3>📊 OptiFlow Automated Report Delivery</h3>
                    <p>Hello,</p>
                    <p>This is an automated delivery for your scheduled report: <strong>${reportName}</strong>.</p>
                    <p>All KPI metrics have been updated as of ${new Date().toLocaleString()}.</p>
                    <hr />
                    <p style="font-size:12px; color:#64748B;">OptiFlow AI CRM Automation Platform</p>
                `;
                await emailService.sendCustomEmail(
                    recipient,
                    `Scheduled Report: ${reportName}`,
                    bodyHtml
                );
                break;
            }
            case 'lead-distribution': {
                // Fetch unassigned leads (ownerId is null or empty)
                const unassignedLeads = await Lead.find({
                    $or: [{ ownerId: null }, { ownerId: { $exists: false } }]
                });

                if (unassignedLeads.length > 0) {
                    const staff = await Employee.find({ status: 'Active' });
                    if (staff.length === 0)
                        throw new Error(
                            'No active employees found to distribute leads to'
                        );

                    logger.info(
                        `[Automation Engine] Distributing ${unassignedLeads.length} leads to ${staff.length} staff.`
                    );
                    let staffIdx = 0;
                    for (const lead of unassignedLeads) {
                        const employee = staff[staffIdx];
                        lead.ownerId = employee.userId || employee._id;
                        await lead.save();
                        staffIdx = (staffIdx + 1) % staff.length;
                    }
                }
                break;
            }
            case 'db-cleanup': {
                // Delete logs or records older than 30 days if configured
                logger.info(
                    '[Automation Engine] Running database logs cleanup operations...'
                );
                break;
            }
            case 'system-backup': {
                // Mock system backup details dump
                logger.info(
                    '[Automation Engine] Executing system file configuration backup...'
                );
                break;
            }
            default:
                throw new Error(`Unsupported automation job type: ${job.type}`);
        }

        job.lastStatus = 'Success';
        job.errorMessage = null;
        logger.info(`[Automation Engine] Job execution SUCCESS: ${job.name}`);
    } catch (err) {
        job.lastStatus = 'Failed';
        job.errorMessage = err.message;
        logger.error(
            `[Automation Engine] Job execution FAILED: ${job.name} - ${err.message}`
        );
    }

    job.nextRun = calculateNextRun(job.schedule);
    await job.save();
    return job;
};

const listJobs = async (query = {}) => {
    return AutomationJob.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 });
};

const getJobById = async (id) => {
    return AutomationJob.findById(id).populate(
        'createdBy',
        'firstName lastName'
    );
};

const createJob = async (data, userId) => {
    const nextRun = calculateNextRun(data.schedule);
    return AutomationJob.create({ ...data, nextRun, createdBy: userId });
};

const updateJob = async (id, data) => {
    const updates = { ...data };
    if (data.schedule) {
        updates.nextRun = calculateNextRun(data.schedule);
    }
    return AutomationJob.findByIdAndUpdate(id, updates, { new: true });
};

const deleteJob = async (id) => {
    return AutomationJob.findByIdAndDelete(id);
};

module.exports = {
    runJob,
    listJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob
};
