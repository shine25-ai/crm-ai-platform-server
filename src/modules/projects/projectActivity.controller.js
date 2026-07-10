const projectActivityService = require('./projectActivity.service');
const ApiResponse = require('../../shared/utils/response');

const search = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Project audit trail retrieved successfully',
            await projectActivityService.searchProjectActivities(req.query)
        );
    } catch (error) {
        next(error);
    }
};

module.exports = { search };
