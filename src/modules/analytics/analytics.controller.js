const analyticsService = require('./analytics.service');
const ApiResponse = require('../../shared/utils/response');

const getDashboardSummary = async (req, res, next) => {
    try {
        const summary = await analyticsService.getDashboardSummary();
        return ApiResponse.success(
            res,
            'Dashboard summary retrieved successfully',
            summary
        );
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboardSummary };
