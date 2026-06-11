const employeeService = require('./employee.service');
const ApiResponse = require('../../shared/utils/response');

const getEmployees = async (req, res, next) => {
    try {
        const employees = await employeeService.getAllEmployees();
        return ApiResponse.success(
            res,
            'Employees retrieved successfully',
            employees
        );
    } catch (error) {
        next(error);
    }
};

const getEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.getEmployeeById(req.params.id);
        return ApiResponse.success(
            res,
            'Employee retrieved successfully',
            employee
        );
    } catch (error) {
        next(error);
    }
};

const createEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.createEmployee(req.body);
        return ApiResponse.success(
            res,
            'Employee created successfully. Onboarding email sent.',
            employee,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.updateEmployee(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Employee updated successfully',
            employee
        );
    } catch (error) {
        next(error);
    }
};

const deleteEmployee = async (req, res, next) => {
    try {
        await employeeService.deleteEmployee(req.params.id);
        return ApiResponse.success(res, 'Employee deleted successfully');
    } catch (error) {
        next(error);
    }
};

const resendOnboarding = async (req, res, next) => {
    try {
        await employeeService.resendOnboardingEmail(req.params.id);
        return ApiResponse.success(
            res,
            'Onboarding invitation email resent successfully'
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    resendOnboarding
};
