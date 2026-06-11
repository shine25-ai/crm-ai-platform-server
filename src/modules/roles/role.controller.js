const roleService = require('./role.service');
const ApiResponse = require('../../shared/utils/response');

const getRoles = async (req, res, next) => {
    try {
        const roles = await roleService.getAllRoles();
        return ApiResponse.success(res, 'Roles retrieved successfully', roles);
    } catch (error) {
        next(error);
    }
};

const createRole = async (req, res, next) => {
    try {
        const role = await roleService.createRole(req.body);
        return ApiResponse.success(res, 'Role created successfully', role, 201);
    } catch (error) {
        next(error);
    }
};

const updateRole = async (req, res, next) => {
    try {
        const role = await roleService.updateRole(req.params.id, req.body);
        return ApiResponse.success(res, 'Role updated successfully', role);
    } catch (error) {
        next(error);
    }
};

const deleteRole = async (req, res, next) => {
    try {
        await roleService.deleteRole(req.params.id);
        return ApiResponse.success(res, 'Role deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getRoles,
    createRole,
    updateRole,
    deleteRole
};
