const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get(
    '/dashboard',
    authorize('sales:read'),
    billingController.getBillingDashboard
);
router.get('/invoices', authorize('sales:read'), billingController.getInvoices);
router.get(
    '/invoices/:id',
    authorize('sales:read'),
    billingController.getInvoiceById
);
router.post(
    '/invoices',
    authorize('sales:write'),
    billingController.createInvoice
);
router.put(
    '/invoices/:id/status',
    authorize('sales:write'),
    billingController.updateInvoiceStatus
);
router.post(
    '/invoices/:id/payments',
    authorize('sales:write'),
    billingController.recordPayment
);
router.post(
    '/invoices/:id/email',
    authorize('sales:write'),
    billingController.emailInvoice
);

module.exports = router;
