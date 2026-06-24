const express = require('express');
const router = express.Router();
const customerController = require('./customer.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('customers:read'), customerController.getCustomers);
router.get(
    '/opportunities',
    authorize('customers:read'),
    customerController.getOpportunities
);
router.get('/:id', authorize('customers:read'), customerController.getCustomer);
router.post(
    '/',
    authorize('customers:write'),
    customerController.createCustomer
);

module.exports = router;
