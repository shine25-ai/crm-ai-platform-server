const ActivityLog = require('./activityLog.model');
const ApiResponse = require('../../shared/utils/response');

const getActivityLogs = async (req, res, next) => {
    try {
        const logs = await ActivityLog.find({})
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(Number(req.query.limit) || 100);

        return ApiResponse.success(
            res,
            'Activity logs retrieved successfully',
            logs
        );
    } catch (error) {
        next(error);
    }
};

module.exports = { getActivityLogs };
