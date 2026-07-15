const { Company, Subscription } = require('../../modules/saas/saas.model');
const User = require('../../modules/users/user.model');
const AppError = require('../utils/appError');
const { runWithTenant } = require('../utils/tenantContext');

const PLATFORM_ROLE = 'SUPER_ADMIN';

const attachTenantContext = async (req, res, next) => {
    try {
        if (req.tenantContextAttached) return next();

        let roleCode = req.user?.roleCode;
        let tokenTenantId = req.user?.tenantId || req.user?.companyId || null;

        if ((!roleCode || !tokenTenantId) && req.user?.userId) {
            const dbUser = await User.findById(req.user.userId).populate(
                'roleId'
            );
            if (dbUser) {
                roleCode = roleCode || dbUser.roleId?.roleCode;
                tokenTenantId =
                    tokenTenantId ||
                    dbUser.tenantId ||
                    dbUser.companyId ||
                    null;
                req.user.roleCode = roleCode;
                req.user.tenantId = tokenTenantId;
                req.user.companyId = tokenTenantId;
            }
        }

        req.isPlatformSuperAdmin = roleCode === PLATFORM_ROLE;
        req.tenantId = tokenTenantId;
        req.companyId = req.tenantId;
        req.tenant = null;
        req.subscription = null;
        req.plan = null;

        if (req.isPlatformSuperAdmin && !req.tenantId) {
            req.tenantContextAttached = true;
            return runWithTenant(
                { tenantId: null, isPlatformSuperAdmin: true },
                () => next()
            );
        }

        if (!req.tenantId) {
            throw new AppError('Tenant context missing for this account', 403);
        }

        const company = await Company.findById(req.tenantId);
        if (!company) throw new AppError('Company tenant not found', 403);

        if (['suspended', 'cancelled', 'archived'].includes(company.status)) {
            throw new AppError(
                `Company access is ${company.status}. Contact platform support.`,
                403
            );
        }

        const subscription = await Subscription.findOne({
            companyId: company._id,
            status: { $in: ['trialing', 'active', 'past_due'] }
        })
            .sort({ createdAt: -1 })
            .populate('planId');

        req.tenant = company;
        req.subscription = subscription || null;
        req.plan = subscription?.planId || null;
        req.tenantContextAttached = true;

        return runWithTenant(
            {
                tenantId: req.tenantId,
                companyId: req.companyId,
                isPlatformSuperAdmin: req.isPlatformSuperAdmin
            },
            () => next()
        );
    } catch (error) {
        return next(error);
    }
};

const requirePlatformAdmin = (req, res, next) => {
    if (!req.isPlatformSuperAdmin && req.user?.roleCode !== PLATFORM_ROLE) {
        return next(new AppError('Platform super-admin access required', 403));
    }
    return next();
};

const tenantFilter = (req, extra = {}) => {
    if (req.isPlatformSuperAdmin && !req.tenantId) return { ...extra };
    return { ...extra, tenantId: req.tenantId };
};

const assertTenantRecord = (req, record) => {
    if (!record || req.isPlatformSuperAdmin) return true;
    const recordTenantId = record.tenantId || record.companyId;
    if (
        recordTenantId &&
        String(recordTenantId) !== String(req.tenantId || '')
    ) {
        throw new AppError('Cross-tenant access is not allowed', 403);
    }
    return true;
};

const requireFeature = (featureKey) => (req, res, next) => {
    if (req.isPlatformSuperAdmin) return next();
    const enabled = req.plan?.featureFlags?.[featureKey];
    if (!enabled) {
        return next(
            new AppError(
                `This feature is not available in your current plan: ${featureKey}`,
                402
            )
        );
    }
    return next();
};

const usageLimitMap = {
    users: 'maxUsers',
    employees: 'maxEmployees',
    leads: 'maxLeads',
    customers: 'maxCustomers',
    aiRequests: 'maxAIRequestsPerMonth',
    workflowRuns: 'maxWorkflowRunsPerMonth',
    whatsappMessages: 'maxWhatsappMessagesPerMonth',
    emailSends: 'maxEmailSendsPerMonth',
    reportExports: 'maxReportExportsPerMonth'
};

const requireUsageLimit =
    (usageKey, currentUsageResolver = null) =>
    async (req, res, next) => {
        try {
            if (req.isPlatformSuperAdmin) return next();
            const limitKey = usageLimitMap[usageKey];
            const limit = req.plan?.usageLimits?.[limitKey];
            if (limit === undefined || limit === null || Number(limit) < 0) {
                return next();
            }
            const currentUsage =
                typeof currentUsageResolver === 'function'
                    ? await currentUsageResolver(req)
                    : 0;
            if (Number(currentUsage) >= Number(limit)) {
                throw new AppError(
                    `Plan limit reached for ${usageKey}. Please upgrade your plan.`,
                    402
                );
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };

module.exports = {
    attachTenantContext,
    requirePlatformAdmin,
    tenantFilter,
    assertTenantRecord,
    requireFeature,
    requireUsageLimit
};
