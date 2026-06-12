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
            const permissions = role?.permissions || [];

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
