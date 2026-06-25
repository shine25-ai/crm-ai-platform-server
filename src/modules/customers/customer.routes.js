const express = require('express');
const router = express.Router();
const customerController = require('./customer.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const upload = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

router
    .route('/')
    .get(customerController.listCustomers)
    .post(customerController.createCustomer);

router
    .route('/:id')
    .get(customerController.getCustomer)
    .put(customerController.updateCustomer)
    .delete(customerController.deleteCustomer);

router.post('/:id/contacts', customerController.addContact);
router.put('/:id/contacts/:contactId', customerController.updateContact);
router.delete('/:id/contacts/:contactId', customerController.deleteContact);

router.post(
    '/:id/documents',
    upload.single('file'),
    customerController.uploadDocument
);
router.delete('/:id/documents/:documentId', customerController.deleteDocument);

router.post('/:id/follow-ups', customerController.addFollowUp);
router.post('/:id/meetings', customerController.addMeeting);
router.post('/:id/transactions', customerController.addTransaction);
router.post('/:id/opportunities', customerController.addOpportunity);
router.post('/:id/projects', customerController.addProjectEngagement);
router.post(
    '/:id/projects/:engagementId/generate-invoices',
    customerController.generateInvoices
);
router.post(
    '/:id/projects/:engagementId/payments',
    customerController.addPaymentRecord
);
router.get(
    '/:id/projects/:engagementId/invoices/:invoiceId/preview',
    customerController.viewInvoice
);

module.exports = router;
