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

        // Log Activity, Audit and create system notification
        const {
            logActivity,
            logAudit
        } = require('../../shared/services/audit.service');
        const {
            createNotification
        } = require('../notifications/notification.service');

        await logActivity(
            req.user.userId,
            'CREATE_EMPLOYEE',
            'Employees',
            `Created employee ${employee.name}`,
            req
        );
        await logAudit(
            req.user.userId,
            'Employees',
            'CREATE',
            null,
            employee.toObject(),
            req
        );
        await createNotification(
            req.user.userId,
            'Invitation Sent',
            `Onboarding invitation sent to ${employee.name}`,
            'Invitation Sent'
        );

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
        // Fetch old data for audit diff
        let oldData = null;
        try {
            const oldEmployee = await employeeService.getEmployeeById(
                req.params.id
            );
            oldData = oldEmployee ? oldEmployee.toObject() : null;
        } catch (e) {
            // ignore
        }

        const employee = await employeeService.updateEmployee(
            req.params.id,
            req.body
        );

        const {
            logActivity,
            logAudit
        } = require('../../shared/services/audit.service');
        await logActivity(
            req.user.userId,
            'UPDATE_EMPLOYEE',
            'Employees',
            `Updated employee ${employee.name}`,
            req
        );
        await logAudit(
            req.user.userId,
            'Employees',
            'UPDATE',
            oldData,
            employee.toObject(),
            req
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
        let oldData = null;
        try {
            const oldEmployee = await employeeService.getEmployeeById(
                req.params.id
            );
            oldData = oldEmployee ? oldEmployee.toObject() : null;
        } catch (e) {
            // ignore
        }

        await employeeService.deleteEmployee(req.params.id);

        const {
            logActivity,
            logAudit
        } = require('../../shared/services/audit.service');
        await logActivity(
            req.user.userId,
            'DELETE_EMPLOYEE',
            'Employees',
            `Deleted employee ${oldData?.name || req.params.id}`,
            req
        );
        await logAudit(
            req.user.userId,
            'Employees',
            'DELETE',
            oldData,
            null,
            req
        );

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
