const Permission = require('./permission.model');
const AppError = require('../../shared/utils/appError');

const getAllPermissions = async () => {
    return await Permission.find({});
};

const getPermissionById = async (id) => {
    const permission = await Permission.findById(id);
    if (!permission) {
        throw new AppError('Permission not found', 404);
    }
    return permission;
};

const createPermission = async (permissionData) => {
    const { permissionCode } = permissionData;
    const exists = await Permission.findOne({ permissionCode });
    if (exists) {
        throw new AppError('Permission code already exists', 400);
    }
    return await Permission.create(permissionData);
};

const updatePermission = async (id, permissionData) => {
    const permission = await Permission.findById(id);
    if (!permission) {
        throw new AppError('Permission not found', 404);
    }

    if (
        permissionData.permissionCode &&
        permissionData.permissionCode !== permission.permissionCode
    ) {
        const exists = await Permission.findOne({
            permissionCode: permissionData.permissionCode
        });
        if (exists) {
            throw new AppError('Permission code already exists', 400);
        }
        permission.permissionCode = permissionData.permissionCode;
    }

    if (permissionData.permissionName !== undefined)
        permission.permissionName = permissionData.permissionName;
    if (permissionData.module !== undefined)
        permission.module = permissionData.module;
    if (permissionData.description !== undefined)
        permission.description = permissionData.description;
    if (permissionData.status !== undefined)
        permission.status = permissionData.status;

    await permission.save();
    return permission;
};

const deletePermission = async (id) => {
    const permission = await Permission.findById(id);
    if (!permission) {
        throw new AppError('Permission not found', 404);
    }
    await Permission.findByIdAndDelete(id);
    return true;
};

module.exports = {
    getAllPermissions,
    getPermissionById,
    createPermission,
    updatePermission,
    deletePermission
};
