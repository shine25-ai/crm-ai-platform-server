const ActivityLog = require('../../modules/activityLogs/activityLog.model');
const AuditLog = require('../../modules/auditLogs/auditLog.model');

const logActivity = async (userId, action, module, description) => {
    try {
        if (!userId) return;
        await ActivityLog.create({
            userId,
            action,
            module,
            description
        });
    } catch (error) {
        console.error('[Audit Service] Error logging activity:', error.message);
    }
};

const logAudit = async (
    userId,
    module,
    action,
    oldData,
    newData,
    req = null
) => {
    try {
        if (!userId) return;

        let ipAddress = '';
        let userAgent = '';

        if (req) {
            ipAddress =
                req.ip ||
                req.headers['x-forwarded-for'] ||
                req.socket?.remoteAddress ||
                '';
            userAgent = req.headers['user-agent'] || '';
        }

        await AuditLog.create({
            userId,
            module,
            action,
            oldData,
            newData,
            ipAddress,
            userAgent
        });
    } catch (error) {
        console.error('[Audit Service] Error logging audit:', error.message);
    }
};

module.exports = {
    logActivity,
    logAudit
};
