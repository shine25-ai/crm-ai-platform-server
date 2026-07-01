const Role = require('../../modules/roles/role.model');
const AppError = require('../utils/appError');

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

            return next();
        } catch (error) {
            return next(error);
        }
    };

module.exports = authorize;
