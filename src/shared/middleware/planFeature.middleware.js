const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const featureByBaseUrl = {
    '/api/activity-logs': 'reports',
    '/api/analytics': 'analytics',
    '/api/approvals': 'automations',
    '/api/assets': 'assets',
    '/api/attendance': 'attendance',
    '/api/billing': 'billing',
    '/api/chat': 'chat',
    '/api/communications': 'emailTemplates',
    '/api/customers': 'crm',
    '/api/departments': 'hr',
    '/api/documents': 'documents',
    '/api/employee-documents': 'documents',
    '/api/employees': 'hr',
    '/api/expenses': 'expenses',
    '/api/gps-tracking': 'gpsTracking',
    '/api/issues': 'projects',
    '/api/leads': 'crm',
    '/api/leave': 'hr',
    '/api/projects': 'projects',
    '/api/project-activities': 'projects',
    '/api/reports': 'reports',
    '/api/resources': 'projects',
    '/api/sales': 'crm',
    '/api/shifts': 'attendance',
    '/api/tasks': 'crm',
    '/api/timesheets': 'projects'
};

const usageLimitByBaseUrl = {
    '/api/users': {
        modelName: 'User',
        limitKey: 'maxUsers',
        label: 'users'
    },
    '/api/employees': {
        modelName: 'Employee',
        limitKey: 'maxEmployees',
        label: 'employees'
    },
    '/api/leads': {
        modelName: 'Lead',
        limitKey: 'maxLeads',
        label: 'leads'
    },
    '/api/customers': {
        modelName: 'Customer',
        limitKey: 'maxCustomers',
        label: 'customers'
    }
};

const getConfiguredFeature = (baseUrl = '') => {
    const normalizedBaseUrl = String(baseUrl).replace(/\/$/, '');
    return featureByBaseUrl[normalizedBaseUrl] || null;
};

const getUsageLimitConfig = (baseUrl = '') => {
    const normalizedBaseUrl = String(baseUrl).replace(/\/$/, '');
    return usageLimitByBaseUrl[normalizedBaseUrl] || null;
};

const enforceFeatureAvailability = (req) => {
    if (req.method === 'OPTIONS') return;
    if (req.isPlatformSuperAdmin || req.user?.roleCode === 'SUPER_ADMIN') {
        return;
    }

    const featureKey = getConfiguredFeature(req.baseUrl);
    if (!featureKey) return;

    if (!req.plan) {
        throw new AppError(
            'No active subscription plan is assigned to this tenant.',
            402
        );
    }

    if (!req.plan.featureFlags?.[featureKey]) {
        throw new AppError(
            `This feature is not available in your current plan: ${featureKey}`,
            402
        );
    }

    if (req.tenant?.featureSettings?.[featureKey] === false) {
        throw new AppError(
            `This feature is disabled by your tenant administrator: ${featureKey}`,
            403
        );
    }
};

const enforceUsageLimit = async (req) => {
    if (req.method !== 'POST') return;
    if (req.isPlatformSuperAdmin || req.user?.roleCode === 'SUPER_ADMIN') {
        return;
    }

    const config = getUsageLimitConfig(req.baseUrl);
    if (!config || !req.tenantId || !req.plan) return;

    const limit = req.plan.usageLimits?.[config.limitKey];
    if (limit === undefined || limit === null || Number(limit) < 0) return;

    const Model = mongoose.models[config.modelName];
    if (!Model) return;

    const currentUsage = await Model.countDocuments({
        tenantId: req.tenantId
    });
    if (Number(currentUsage) >= Number(limit)) {
        throw new AppError(
            `Plan limit reached for ${config.label}. Please upgrade your plan.`,
            402
        );
    }
};

const enforcePlanAccess = async (req, res, next) => {
    try {
        enforceFeatureAvailability(req);
        await enforceUsageLimit(req);
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    enforcePlanAccess,
    featureByBaseUrl,
    usageLimitByBaseUrl
};
