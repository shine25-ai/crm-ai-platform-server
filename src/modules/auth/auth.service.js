const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../users/user.model');
const Role = require('../roles/role.model');
const RolePermission = require('../permissions/rolePermission.model');
const Employee = require('../employees/employee.model');
const AppError = require('../../shared/utils/appError');
const { generateToken } = require('../../shared/utils/jwt');
const emailService = require('../../shared/services/email.service');

const getRolePermissions = async (role) => {
    if (!role) return [];
    if (role.roleCode === 'SUPER_ADMIN') return ['*'];
    if ((role.permissions || []).includes('*')) return ['*'];

    const mappings = await RolePermission.find({ roleId: role._id }).populate(
        'permissionId',
        'permissionCode'
    );
    const mappedPermissions = mappings
        .map((mapping) => mapping.permissionId?.permissionCode)
        .filter(Boolean);

    return [...new Set([...(role.permissions || []), ...mappedPermissions])];
};

const login = async (email, password) => {
    const user = await User.findOne({ email }).populate('roleId');

    if (!user) {
        throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new AppError('Invalid credentials', 401);
    }

    if (user.status === 'Inactive' || user.status === 'INACTIVE') {
        throw new AppError(
            'Your account setup is complete and pending HR activation.',
            403
        );
    }

    const token = generateToken({
        userId: user._id,
        roleId: user.roleId._id,
        roleCode: user.roleId.roleCode,
        employeeId: user.employeeId || null
    });

    const permissions = await getRolePermissions(user.roleId);

    return {
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            roleCode: user.roleId.roleCode,
            roleName: user.roleId.roleName,
            permissions,
            employeeId: user.employeeId || null
        }
    };
};

const forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError('User with this email does not exist.', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(user.email, resetUrl);
    return true;
};

const resetPassword = async (token, password) => {
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new AppError(
            'Password reset token is invalid or has expired.',
            400
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    return true;
};

/**
 * Validate an onboarding token and return employee preview info.
 * Called when the employee lands on /onboarding?token=...
 */
const verifyOnboardingToken = async (token) => {
    const employee = await Employee.findOne({
        onboardingToken: token,
        onboardingTokenExpires: { $gt: new Date() }
    }).populate('department', 'departmentName');

    if (!employee) {
        throw new AppError(
            'This onboarding link is invalid or has expired. Please contact your administrator.',
            400
        );
    }

    if (employee.onboardingStatus === 'Completed') {
        throw new AppError(
            'Your account has already been set up. Please login directly.',
            400
        );
    }

    return {
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department?.departmentName || '',
        designation: employee.designation
    };
};

/**
 * Complete the onboarding process:
 * 1. Validate token
 * 2. Create a User account with EMPLOYEE role
 * 3. Update Employee record — link User, mark Completed, save personalInfo
 * 4. Clear onboarding token
 */
const completeOnboarding = async (
    token,
    password,
    personalInfo,
    bankDetails
) => {
    const employee = await Employee.findOne({
        onboardingToken: token,
        onboardingTokenExpires: { $gt: new Date() }
    }).populate('department', 'departmentName');

    if (!employee) {
        throw new AppError(
            'This onboarding link is invalid or has expired.',
            400
        );
    }

    if (employee.onboardingStatus === 'Completed') {
        throw new AppError('Onboarding already completed. Please login.', 400);
    }

    // Check if User already exists for this email
    const existingUser = await User.findOne({ email: employee.email });
    if (existingUser) {
        throw new AppError('An account with this email already exists.', 400);
    }

    // Get EMPLOYEE role
    const employeeRole = await Role.findOne({ roleCode: 'EMPLOYEE' });
    if (!employeeRole) {
        throw new AppError(
            'Employee role not configured. Contact system administrator.',
            500
        );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name: employee.name,
        email: employee.email,
        password: hashedPassword,
        roleId: employeeRole._id,
        employeeId: employee._id,
        mobile: employee.mobile,
        department: employee.department?.departmentName || '',
        status: 'Inactive'
    });

    // Update employee record
    employee.onboardingStatus = 'Completed';
    employee.userId = user._id;
    employee.onboardingToken = null;
    employee.onboardingTokenExpires = null;

    // Save personal info if provided
    if (personalInfo) {
        employee.personalInfo = {
            ...employee.personalInfo,
            ...personalInfo
        };
    }

    if (bankDetails) {
        employee.bankDetails = {
            ...employee.bankDetails,
            ...bankDetails
        };
    }

    const hasHrActivationData = Boolean(
        employee.employmentInfo?.joinDate && employee.employmentInfo?.salary
    );
    employee.status = hasHrActivationData ? 'Active' : 'Inactive';
    user.status = employee.status;
    await user.save();

    await employee.save();

    return {
        message:
            'Account setup complete. Your access will be activated after HR completes joining details.',
        email: employee.email
    };
};

module.exports = {
    login,
    forgotPassword,
    resetPassword,
    verifyOnboardingToken,
    completeOnboarding
};
