const mongoose = require('mongoose');
const Role = require('../../modules/roles/role.model');
const AppError = require('../utils/appError');

const checkRecordOwnership = async (req, moduleName, recordId) => {
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
        return true;
    }

    const { roleCode, userId, employeeId } = req.user;

    // Super Admin and Admin bypass ownership validation checks
    if (roleCode === 'SUPER_ADMIN' || roleCode === 'ADMIN') {
        return true;
    }

    try {
        if (moduleName === 'employees') {
            // An employee can only view/update their own profile
            if (roleCode === 'EMPLOYEE') {
                return recordId === employeeId?.toString();
            }
            return true;
        }

        if (moduleName === 'leads') {
            const Lead = mongoose.model('Lead');
            const lead = await Lead.findById(recordId);
            if (!lead) return true;

            // Sales executive and BDE can only access their assigned leads
            if (
                roleCode === 'SALES_EXECUTIVE' ||
                roleCode === 'BUSINESS_DEVELOPMENT_EXECUTIVE'
            ) {
                return (
                    lead.assignedTo &&
                    lead.assignedTo.toString() === userId.toString()
                );
            }

            // Sales managers can access their team members' leads
            if (roleCode === 'SALES_MANAGER') {
                if (
                    lead.assignedTo &&
                    lead.assignedTo.toString() === userId.toString()
                ) {
                    return true;
                }
                const User = mongoose.model('User');
                const Employee = mongoose.model('Employee');
                const assignedUser = await User.findById(lead.assignedTo);
                if (assignedUser && assignedUser.employeeId) {
                    const emp = await Employee.findById(
                        assignedUser.employeeId
                    );
                    if (
                        emp &&
                        emp.manager &&
                        emp.manager.toString() === employeeId?.toString()
                    ) {
                        return true;
                    }
                }
                return false;
            }

            // Non-sales/HR/Admin: Forbidden to access pipeline
            if (['HR', 'HR_MANAGER', 'EMPLOYEE'].includes(roleCode)) {
                return false;
            }
        }

        if (moduleName === 'tasks') {
            const Task = mongoose.model('Task');
            const task = await Task.findById(recordId);
            if (!task) return true;

            // Employees can only access tasks assigned to or created by them
            if (roleCode === 'EMPLOYEE') {
                const isAssignedToMe =
                    task.assignedTo &&
                    task.assignedTo.toString() === userId.toString();
                const isAssignedByMe =
                    task.assignedBy &&
                    task.assignedBy.toString() === userId.toString();
                return isAssignedToMe || isAssignedByMe;
            }
        }
    } catch (error) {
        console.error('Error in checkRecordOwnership middleware:', error);
        return false;
    }

    return true;
};

const authorize =
    (...requiredPermissions) =>
    async (req, res, next) => {
        try {
            if (!req.user?.roleId) {
                throw new AppError('Forbidden', 403);
            }

            const role = await Role.findById(req.user.roleId);
            console.log(
                '🛡️ [Permission Check] User:',
                req.user.name || req.user.email,
                'Token roleId:',
                req.user.roleId,
                'DB Role found:',
                role ? `${role.roleName} (${role.roleCode})` : 'NULL'
            );
            const permissions = role?.permissions || [];

            if (role?.roleCode === 'SUPER_ADMIN') {
                return next();
            }

            if (permissions.includes('*')) {
                return next();
            }

            const allowed = requiredPermissions.some((permission) =>
                permissions.includes(permission)
            );

            if (!allowed) {
                throw new AppError('Forbidden', 403);
            }

            // Enforce record-level ownership checks if resource ID is specified in parameters
            const recordId = req.params.id || req.params.employeeId;
            if (recordId) {
                const pathParts = req.baseUrl.split('/');
                const moduleName = pathParts[pathParts.length - 1];

                const isOwner = await checkRecordOwnership(
                    req,
                    moduleName,
                    recordId
                );
                if (!isOwner) {
                    throw new AppError('Forbidden', 403);
                }
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };

module.exports = authorize;
