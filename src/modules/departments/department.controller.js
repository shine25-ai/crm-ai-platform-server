const departmentService = require('./department.service');
const ApiResponse = require('../../shared/utils/response');

const getDepartments = async (req, res, next) => {
    try {
        const departments = await departmentService.getAllDepartments();
        return ApiResponse.success(
            res,
            'Departments retrieved successfully',
            departments
        );
    } catch (error) {
        next(error);
    }
};

const createDepartment = async (req, res, next) => {
    try {
        const department = await departmentService.createDepartment(req.body);
        return ApiResponse.success(
            res,
            'Department created successfully',
            department,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateDepartment = async (req, res, next) => {
    try {
        const department = await departmentService.updateDepartment(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Department updated successfully',
            department
        );
    } catch (error) {
        next(error);
    }
};

const deleteDepartment = async (req, res, next) => {
    try {
        await departmentService.deleteDepartment(req.params.id);
        return ApiResponse.success(res, 'Department deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
