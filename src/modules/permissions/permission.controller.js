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

const getPermissionById = async (req, res, next) => {
    try {
        const permission = await permissionService.getPermissionById(
            req.params.id
        );
        return ApiResponse.success(
            res,
            'Permission retrieved successfully',
            permission
        );
    } catch (error) {
        next(error);
    }
};

const createPermission = async (req, res, next) => {
    try {
        const permission = await permissionService.createPermission(req.body);
        return ApiResponse.success(
            res,
            'Permission created successfully',
            permission,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updatePermission = async (req, res, next) => {
    try {
        const permission = await permissionService.updatePermission(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Permission updated successfully',
            permission
        );
    } catch (error) {
        next(error);
    }
};

const deletePermission = async (req, res, next) => {
    try {
        await permissionService.deletePermission(req.params.id);
        return ApiResponse.success(res, 'Permission deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPermissions,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission
};
