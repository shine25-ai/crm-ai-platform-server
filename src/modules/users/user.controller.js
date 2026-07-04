const userService = require('./user.service');
const ApiResponse = require('../../shared/utils/response');

const getUsers = async (req, res, next) => {
    try {
        const users = await userService.getAllUsers(req.query);
        return ApiResponse.success(res, 'Users retrieved successfully', users);
    } catch (error) {
        next(error);
    }
};

const createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);
        return ApiResponse.success(res, 'User created successfully', user, 201);
    } catch (error) {
        next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const user = await userService.updateUser(req.params.id, req.body);
        return ApiResponse.success(res, 'User updated successfully', user);
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        await userService.deleteUser(req.params.id);
        return ApiResponse.success(res, 'User deleted successfully');
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        await userService.resetPassword(req.params.id);
        return ApiResponse.success(
            res,
            'Password reset link sent successfully'
        );
    } catch (error) {
        next(error);
    }
};

const getSalesMembers = async (req, res, next) => {
    try {
        const users = await userService.getSalesMembers();
        return ApiResponse.success(
            res,
            'Sales members retrieved successfully',
            users
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers,
    getSalesMembers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword
};
