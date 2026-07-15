const express = require('express');
const saasController = require('./saas.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const {
    attachTenantContext,
    requirePlatformAdmin
} = require('../../shared/middleware/tenant.middleware');

const router = express.Router();

router.post('/webhooks/stripe', saasController.stripeWebhook);
router.post('/webhooks/razorpay', saasController.razorpayWebhook);
router.get('/public/plans', saasController.listPublicPlans);
router.post('/public/signup', saasController.signupCompany);

router.use(authMiddleware);
router.use(attachTenantContext);

router.get('/plans', saasController.listPlans);

router.get('/tenant/billing', saasController.tenantBilling);
router.post(
    '/tenant/cancel-subscription',
    saasController.cancelTenantSubscription
);
router.put('/tenant/billing-contact', saasController.updateBillingContact);
router.get('/tenant/modules', saasController.tenantModules);
router.put('/tenant/modules', saasController.updateTenantModules);
router.post('/checkout', saasController.createCheckout);
router.post('/payments/razorpay/verify', saasController.verifyRazorpayPayment);

router.use(requirePlatformAdmin);

router.get('/platform/dashboard', saasController.platformDashboard);
router
    .route('/companies')
    .get(saasController.listCompanies)
    .post(saasController.createCompany);
router.put('/companies/:id', saasController.updateCompany);
router.put('/companies/:id/status', saasController.updateCompanyStatus);

router.post('/plans', saasController.createPlan);
router.put('/plans/:id', saasController.savePlan);
router.delete('/plans/:id', saasController.archivePlan);
router.post('/subscriptions/assign-plan', saasController.assignPlan);

module.exports = router;
