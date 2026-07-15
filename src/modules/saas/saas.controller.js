const saasService = require('./saas.service');
const ApiResponse = require('../../shared/utils/response');
const AppError = require('../../shared/utils/appError');

const success = (res, message, data, status = 200) =>
    ApiResponse.success(res, message, data, status);

const listCompanies = async (req, res, next) => {
    try {
        return success(
            res,
            'Companies retrieved successfully',
            await saasService.listCompanies(req.query)
        );
    } catch (error) {
        next(error);
    }
};

const createCompany = async (req, res, next) => {
    try {
        return success(
            res,
            'Company tenant created successfully',
            await saasService.createCompany(req.body, req.user.userId),
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateCompanyStatus = async (req, res, next) => {
    try {
        return success(
            res,
            'Company status updated successfully',
            await saasService.updateCompanyStatus(
                req.params.id,
                req.body.status,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const updateCompany = async (req, res, next) => {
    try {
        return success(
            res,
            'Company tenant updated successfully',
            await saasService.updateCompany(
                req.params.id,
                req.body,
                req.user.userId
            )
        );
    } catch (error) {
        next(error);
    }
};

const listPlans = async (req, res, next) => {
    try {
        return success(
            res,
            'Plans retrieved successfully',
            await saasService.listPlans(req.query.includeArchived === 'true')
        );
    } catch (error) {
        next(error);
    }
};

const listPublicPlans = async (req, res, next) => {
    try {
        return success(
            res,
            'Public plans retrieved successfully',
            await saasService.listPublicPlans()
        );
    } catch (error) {
        next(error);
    }
};

const signupCompany = async (req, res, next) => {
    try {
        return success(
            res,
            'Company signup completed successfully',
            await saasService.signupCompany(req.body),
            201
        );
    } catch (error) {
        next(error);
    }
};

const savePlan = async (req, res, next) => {
    try {
        return success(
            res,
            'Plan saved successfully',
            await saasService.upsertPlan({ ...req.body, _id: req.params.id })
        );
    } catch (error) {
        next(error);
    }
};

const createPlan = async (req, res, next) => {
    try {
        return success(
            res,
            'Plan created successfully',
            await saasService.upsertPlan(req.body),
            201
        );
    } catch (error) {
        next(error);
    }
};

const archivePlan = async (req, res, next) => {
    try {
        return success(
            res,
            'Plan archived successfully',
            await saasService.archivePlan(req.params.id)
        );
    } catch (error) {
        next(error);
    }
};

const assignPlan = async (req, res, next) => {
    try {
        return success(
            res,
            'Plan assigned successfully',
            await saasService.assignPlan(req.body)
        );
    } catch (error) {
        next(error);
    }
};

const tenantBilling = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            throw new AppError(
                'Tenant billing is available only for tenant users. Platform super-admins should use the Platform SaaS Admin dashboard.',
                400
            );
        }
        return success(
            res,
            'Tenant billing retrieved successfully',
            await saasService.getTenantBilling(req.tenantId)
        );
    } catch (error) {
        next(error);
    }
};

const cancelTenantSubscription = async (req, res, next) => {
    try {
        return success(
            res,
            'Subscription cancelled successfully',
            await saasService.cancelTenantSubscription(req.tenantId)
        );
    } catch (error) {
        next(error);
    }
};

const updateBillingContact = async (req, res, next) => {
    try {
        return success(
            res,
            'Billing contact updated successfully',
            await saasService.updateBillingContact(req.tenantId, req.body)
        );
    } catch (error) {
        next(error);
    }
};

const tenantModules = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            throw new AppError(
                'Tenant module settings are available only for tenant users.',
                400
            );
        }

        return success(
            res,
            'Tenant modules retrieved successfully',
            await saasService.getTenantModules(req.tenantId)
        );
    } catch (error) {
        next(error);
    }
};

const updateTenantModules = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            throw new AppError(
                'Tenant module settings are available only for tenant users.',
                400
            );
        }

        return success(
            res,
            'Tenant module settings updated successfully',
            await saasService.updateTenantModules(
                req.tenantId,
                req.body.modules || req.body
            )
        );
    } catch (error) {
        next(error);
    }
};

const platformDashboard = async (req, res, next) => {
    try {
        return success(
            res,
            'Platform billing dashboard retrieved successfully',
            await saasService.getPlatformDashboard()
        );
    } catch (error) {
        next(error);
    }
};

const createCheckout = async (req, res, next) => {
    try {
        return success(
            res,
            'Checkout prepared successfully',
            await saasService.createCheckout({
                companyId: req.body.companyId || req.tenantId,
                planId: req.body.planId,
                provider: req.body.provider,
                userId: req.user?.userId
            })
        );
    } catch (error) {
        next(error);
    }
};

const verifyRazorpayPayment = async (req, res, next) => {
    try {
        return success(
            res,
            'Razorpay payment verified successfully',
            await saasService.activateRazorpayPayment({
                orderId: req.body.razorpay_order_id || req.body.orderId,
                paymentId: req.body.razorpay_payment_id || req.body.paymentId,
                signature: req.body.razorpay_signature || req.body.signature,
                source: 'checkout'
            })
        );
    } catch (error) {
        next(error);
    }
};

const recordWebhook = (provider) => async (req, res, next) => {
    try {
        saasService.verifyWebhookSignature({
            provider,
            rawBody: req.rawBody,
            headers: req.headers
        });
        const eventId =
            req.body.id ||
            req.body.event ||
            req.headers['x-razorpay-event-id'] ||
            req.headers['stripe-event-id'];
        const eventType = req.body.type || req.body.event || 'unknown';
        const result = await saasService.processWebhook({
            provider,
            eventId: String(eventId || `${provider}-${Date.now()}`),
            eventType,
            payload: req.body
        });
        const lifecycle =
            provider === 'razorpay'
                ? await saasService.handleRazorpayWebhook(req.body)
                : null;
        return success(res, 'Billing webhook recorded successfully', {
            ...result,
            lifecycle
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listCompanies,
    createCompany,
    updateCompany,
    updateCompanyStatus,
    listPlans,
    listPublicPlans,
    signupCompany,
    createPlan,
    savePlan,
    archivePlan,
    assignPlan,
    tenantBilling,
    cancelTenantSubscription,
    updateBillingContact,
    tenantModules,
    updateTenantModules,
    platformDashboard,
    createCheckout,
    verifyRazorpayPayment,
    stripeWebhook: recordWebhook('stripe'),
    razorpayWebhook: recordWebhook('razorpay')
};
