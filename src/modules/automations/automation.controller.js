const automationService = require('./automation.service');
const AutomationJob = require('./automationJob.model');
const ApiResponse = require('../../shared/utils/response');

const success = (res, message, data, status = 200) =>
    ApiResponse.success(res, message, data, status);

const listJobs = async (req, res, next) => {
    try {
        const jobs = await automationService.listJobs(req.query);
        return success(res, 'Automation jobs retrieved successfully', jobs);
    } catch (error) {
        next(error);
    }
};

const getJob = async (req, res, next) => {
    try {
        const job = await automationService.getJobById(req.params.id);
        if (!job) {
            return res
                .status(404)
                .json({ success: false, message: 'Automation job not found' });
        }
        return success(
            res,
            'Automation job details retrieved successfully',
            job
        );
    } catch (error) {
        next(error);
    }
};

const createJob = async (req, res, next) => {
    try {
        const job = await automationService.createJob(
            req.body,
            req.user.userId
        );
        return success(res, 'Automation job created successfully', job, 201);
    } catch (error) {
        next(error);
    }
};

const updateJob = async (req, res, next) => {
    try {
        const job = await automationService.updateJob(req.params.id, req.body);
        if (!job) {
            return res
                .status(404)
                .json({ success: false, message: 'Automation job not found' });
        }
        return success(res, 'Automation job updated successfully', job);
    } catch (error) {
        next(error);
    }
};

const deleteJob = async (req, res, next) => {
    try {
        const job = await automationService.deleteJob(req.params.id);
        if (!job) {
            return res
                .status(404)
                .json({ success: false, message: 'Automation job not found' });
        }
        return success(res, 'Automation job deleted successfully', null);
    } catch (error) {
        next(error);
    }
};

const triggerJob = async (req, res, next) => {
    try {
        const job = await AutomationJob.findById(req.params.id);
        if (!job) {
            return res
                .status(404)
                .json({ success: false, message: 'Automation job not found' });
        }
        const result = await automationService.runJob(job);
        return success(res, 'Automation job executed successfully', result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    triggerJob
};
