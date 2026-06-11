const crypto = require('crypto');
const Employee = require('./employee.model');
const Department = require('../departments/department.model');
const AppError = require('../../shared/utils/appError');
const emailService = require('../../shared/services/email.service');

/**
 * Recount active employees per department and update employeeCount.
 */
const updateDepartmentCounts = async () => {
    const counts = await Employee.aggregate([
        { $match: { status: 'Active' } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    await Department.updateMany({}, { employeeCount: 0 });

    for (const item of counts) {
        if (item._id) {
            await Department.findByIdAndUpdate(item._id, {
                employeeCount: item.count
            });
        }
    }
};

/**
 * Get all employees with department and manager populated.
 */
const getAllEmployees = async () => {
    return await Employee.find({})
        .populate('department', 'departmentName status')
        .populate('manager', 'name designation employeeId')
        .sort({ createdAt: -1 });
};

/**
 * Get a single employee by ID (populated).
 */
const getEmployeeById = async (id) => {
    const employee = await Employee.findById(id)
        .populate('department', 'departmentName status')
        .populate('manager', 'name designation employeeId');
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
};

/**
 * Create a new employee and send the onboarding invitation email.
 */
const createEmployee = async (empData) => {
    // Auto-generate employee ID
    if (!empData.employeeId) {
        const count = await Employee.countDocuments();
        empData.employeeId = `EMP${String(count + 1).padStart(3, '0')}`;
    }

    // Validate department
    const dept = await Department.findById(empData.department);
    if (!dept) {
        throw new AppError(
            'Department not found. Please select a valid department.',
            404
        );
    }

    // Validate manager if provided
    if (empData.manager && empData.manager !== 'None') {
        const mgr = await Employee.findById(empData.manager);
        if (!mgr) {
            throw new AppError('Specified manager employee not found', 404);
        }
    } else {
        empData.manager = null;
    }

    // Generate a secure onboarding token (48h expiry)
    const onboardingToken = crypto.randomBytes(32).toString('hex');
    const onboardingTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const employee = await Employee.create({
        ...empData,
        onboardingToken,
        onboardingTokenExpires,
        onboardingStatus: 'Pending'
    });

    // Build onboarding URL and send email (non-blocking — don't fail creation on email error)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const onboardingUrl = `${frontendUrl}/onboarding?token=${onboardingToken}`;

    try {
        await emailService.sendOnboardingEmail(
            employee.email,
            employee.name,
            employee.employeeId,
            dept.departmentName,
            onboardingUrl
        );
    } catch (emailError) {
        console.error(
            '[Employee Service] Onboarding email failed (employee still created):',
            emailError.message
        );
    }

    await updateDepartmentCounts();

    return await Employee.findById(employee._id)
        .populate('department', 'departmentName status')
        .populate('manager', 'name designation employeeId');
};

/**
 * Resend onboarding email for a Pending employee (refreshes token).
 */
const resendOnboardingEmail = async (id) => {
    const employee = await Employee.findById(id).populate(
        'department',
        'departmentName'
    );
    if (!employee) throw new AppError('Employee not found', 404);

    if (employee.onboardingStatus === 'Completed') {
        throw new AppError('Employee has already completed onboarding', 400);
    }

    if (!employee.email) {
        throw new AppError('Employee does not have an email address', 400);
    }

    // Refresh token
    const onboardingToken = crypto.randomBytes(32).toString('hex');
    const onboardingTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    employee.onboardingToken = onboardingToken;
    employee.onboardingTokenExpires = onboardingTokenExpires;
    await employee.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const onboardingUrl = `${frontendUrl}/onboarding?token=${onboardingToken}`;

    await emailService.sendOnboardingEmail(
        employee.email,
        employee.name,
        employee.employeeId,
        employee.department?.departmentName || 'Your Department',
        onboardingUrl
    );

    return true;
};

/**
 * Update an existing employee.
 */
const updateEmployee = async (id, empData) => {
    const employee = await Employee.findById(id);
    if (!employee) throw new AppError('Employee not found', 404);

    if (empData.department) {
        const dept = await Department.findById(empData.department);
        if (!dept) throw new AppError('Department not found.', 404);
    }

    if (empData.manager && empData.manager !== 'None') {
        const mgr = await Employee.findById(empData.manager);
        if (!mgr)
            throw new AppError('Specified manager employee not found', 404);
    } else if (empData.manager === 'None' || empData.manager === '') {
        empData.manager = null;
    }

    Object.assign(employee, empData);
    await employee.save();
    await updateDepartmentCounts();

    return await Employee.findById(employee._id)
        .populate('department', 'departmentName status')
        .populate('manager', 'name designation employeeId');
};

/**
 * Delete an employee. Also updates department counts.
 */
const deleteEmployee = async (id) => {
    const employee = await Employee.findById(id);
    if (!employee) throw new AppError('Employee not found', 404);
    await Employee.findByIdAndDelete(id);
    await updateDepartmentCounts();
    return true;
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    resendOnboardingEmail,
    updateEmployee,
    deleteEmployee,
    updateDepartmentCounts
};
