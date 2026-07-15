const jwt = require('jsonwebtoken');
const { attachTenantContext } = require('./tenant.middleware');
const { enforcePlanAccess } = require('./planFeature.middleware');

module.exports = (req, res, next) => {
    try {
        const token =
            req.headers.authorization?.split(' ')[1] || req.query.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token missing'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        return attachTenantContext(req, res, (tenantError) => {
            if (tenantError) return next(tenantError);
            return enforcePlanAccess(req, res, next);
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};
