const Role = require('./role.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const RolePermission = require('../permissions/rolePermission.model');
const Permission = require('../permissions/permission.model');
const mongoose = require('mongoose');

const getAllRoles = async () => {
    const roles = await Role.find({});

    const userCounts = await User.aggregate([
        { $group: { _id: '$roleId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    for (const item of userCounts) {
        if (item._id) {
            countMap[item._id.toString()] = item.count;
        }
    }

    return roles.map((role) => {
        const roleObj = role.toObject();
        roleObj.usersCount = countMap[role._id.toString()] || 0;
        return roleObj;
    });
};

const createRole = async (roleData) => {
    const { roleName, description, permissions } = roleData;
    const roleCode = roleName.toUpperCase().replace(/\s+/g, '_');

    const exists = await Role.findOne({ roleCode });
    if (exists) {
        throw new AppError('Role already exists', 400);
    }

    const role = await Role.create({
        roleCode,
        roleName,
        description,
        permissions: permissions || [],
        status: 'Active'
    });

    if (permissions && permissions.length > 0) {
        const validObjectIds = permissions.filter((p) =>
            mongoose.Types.ObjectId.isValid(p)
        );
        const resolvedPermissions = await Permission.find({
            $or: [
                { _id: { $in: validObjectIds } },
                { permissionCode: { $in: permissions } }
            ]
        });

        const rolePermissions = resolvedPermissions.map((p) => ({
            roleId: role._id,
            permissionId: p._id
        }));

        if (rolePermissions.length > 0) {
            await RolePermission.insertMany(rolePermissions);
        }

        role.permissions = resolvedPermissions.map((p) => p.permissionCode);
        await role.save();
    }

    return role;
};

const updateRole = async (id, roleData) => {
    const role = await Role.findById(id);
    if (!role) {
        throw new AppError('Role not found', 404);
    }

    if (roleData.roleName) {
        role.roleName = roleData.roleName;
        role.roleCode = roleData.roleName.toUpperCase().replace(/\s+/g, '_');
    }
    if (roleData.description !== undefined)
        role.description = roleData.description;

    if (roleData.permissions !== undefined) {
        const validObjectIds = roleData.permissions.filter((p) =>
            mongoose.Types.ObjectId.isValid(p)
        );
        const resolvedPermissions = await Permission.find({
            $or: [
                { _id: { $in: validObjectIds } },
                { permissionCode: { $in: roleData.permissions } }
            ]
        });

        await RolePermission.deleteMany({ roleId: id });

        const rolePermissions = resolvedPermissions.map((p) => ({
            roleId: id,
            permissionId: p._id
        }));

        if (rolePermissions.length > 0) {
            await RolePermission.insertMany(rolePermissions);
        }

        role.permissions = resolvedPermissions.map((p) => p.permissionCode);
    }

    if (roleData.status !== undefined) role.status = roleData.status;

    await role.save();
    return role;
};

const deleteRole = async (id) => {
    const role = await Role.findById(id);
    if (!role) {
        throw new AppError('Role not found', 404);
    }
    if (role.isSystemRole) {
        throw new AppError('Cannot delete system role', 400);
    }
    await Role.findByIdAndDelete(id);
    return true;
};

module.exports = {
    getAllRoles,
    createRole,
    updateRole,
    deleteRole
};
