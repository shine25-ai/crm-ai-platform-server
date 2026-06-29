const User = require('./user.model');
const Role = require('../roles/role.model');
const bcrypt = require('bcryptjs');
const AppError = require('../../shared/utils/appError');
const authService = require('../auth/auth.service');

const normalizeStatus = (status) => {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'INACTIVE') return 'Inactive';
    return status || 'Active';
};

const mapUserRole = (user) => {
    if (!user) return user;
    const userObj = user.toObject ? user.toObject() : user;
    userObj.status = normalizeStatus(userObj.status);
    if (userObj.roleId && userObj.roleId.roleName) {
        userObj.role = userObj.roleId.roleName;
    }
    return userObj;
};

const getAllUsers = async () => {
    const users = await User.find({}).populate('roleId');
    return users.map(mapUserRole);
};

const getSalesMembers = async () => {
    const roles = await Role.find({
        roleCode: { $in: ['SALES_MANAGER', 'SALES_EXECUTIVE'] }
    });
    const roleIds = roles.map((r) => r._id);
    const users = await User.find({
        $or: [{ department: 'Sales' }, { roleId: { $in: roleIds } }],
        status: { $in: ['Active', 'ACTIVE'] }
    }).populate('roleId');
    return users.map(mapUserRole);
};

const createUser = async (userData) => {
    const { name, email, password, roleId, role, mobile, department } =
        userData;

    const exists = await User.findOne({ email });
    if (exists) {
        throw new AppError('User with this email already exists', 400);
    }

    let resolvedRoleId = roleId;
    if (role && !resolvedRoleId) {
        const foundRole = await Role.findOne({ roleName: role });
        if (foundRole) {
            resolvedRoleId = foundRole._id;
        }
    }

    if (!resolvedRoleId) {
        // Fallback to Admin role if not found
        const defaultRole = await Role.findOne({ roleCode: 'ADMIN' });
        if (defaultRole) resolvedRoleId = defaultRole._id;
    }

    const pass = password || 'Welcome@123';
    const hashedPassword = await bcrypt.hash(pass, 10);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        roleId: resolvedRoleId,
        mobile,
        department,
        status: 'Active'
    });

    const populatedUser = await User.findById(user._id).populate('roleId');
    return mapUserRole(populatedUser);
};

const updateUser = async (id, userData) => {
    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    if (userData.name !== undefined) user.name = userData.name;
    if (userData.email !== undefined) {
        const emailExists = await User.findOne({
            email: userData.email,
            _id: { $ne: id }
        });
        if (emailExists) throw new AppError('Email already in use', 400);
        user.email = userData.email;
    }

    if (userData.role !== undefined) {
        const foundRole = await Role.findOne({ roleName: userData.role });
        if (foundRole) {
            user.roleId = foundRole._id;
        }
    } else if (userData.roleId !== undefined) {
        user.roleId = userData.roleId;
    }

    if (userData.mobile !== undefined) user.mobile = userData.mobile;
    if (userData.department !== undefined)
        user.department = userData.department;
    if (userData.status !== undefined)
        user.status = normalizeStatus(userData.status);

    await user.save();
    const populatedUser = await User.findById(id).populate('roleId');
    return mapUserRole(populatedUser);
};

const deleteUser = async (id) => {
    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    await User.findByIdAndDelete(id);
    return true;
};

const resetPassword = async (id) => {
    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    await authService.forgotPassword(user.email);
    return true;
};

module.exports = {
    getAllUsers,
    getSalesMembers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword
};
