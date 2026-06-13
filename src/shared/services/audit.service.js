const ActivityLog = require('../../modules/activityLogs/activityLog.model');
const AuditLog = require('../../modules/auditLogs/auditLog.model');

const getDeviceType = (userAgent) => {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (
        ua.includes('mobi') ||
        ua.includes('android') ||
        ua.includes('iphone')
    ) {
        return 'Mobile';
    }
    if (
        ua.includes('ipad') ||
        ua.includes('tablet') ||
        ua.includes('playbook') ||
        ua.includes('kindle')
    ) {
        return 'Tablet';
    }
    return 'Desktop';
};

const getLocationFromIp = (ipAddress, req = null) => {
    if (!ipAddress) return 'Unknown Location';
    if (
        ipAddress === '::1' ||
        ipAddress === '127.0.0.1' ||
        ipAddress.includes('127.0.0.1')
    ) {
        return 'Localhost (Loopback)';
    }
    if (req && req.headers && req.headers['cf-ipcountry']) {
        return req.headers['cf-ipcountry'];
    }
    return 'Unknown Location';
};

const logActivity = async (userId, action, module, description, req = null) => {
    try {
        if (!userId) return;

        let ipAddress = '';
        let deviceType = '';
        let location = '';

        if (req) {
            ipAddress =
                req.ip ||
                req.headers['x-forwarded-for'] ||
                req.socket?.remoteAddress ||
                '';
            const userAgent = req.headers['user-agent'] || '';
            deviceType = getDeviceType(userAgent);
            location = getLocationFromIp(ipAddress, req);
        }

        await ActivityLog.create({
            userId,
            action,
            module,
            description,
            ipAddress,
            deviceType,
            location
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
