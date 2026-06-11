const permissionService = require('./permission.service');
const ApiResponse = require('../../shared/utils/response');

const getPermissions = async (req, res, next) => {
    try {
        const permissions = await permissionService.getAllPermissions();
        return ApiResponse.success(
            res,
            'Permissions retrieved successfully',
            permissions
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPermissions
};
