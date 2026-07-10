const billingService = require('./billing.service');
const ApiResponse = require('../../shared/utils/response');

const createInvoice = async (req, res, next) => {
    try {
        const invoice = await billingService.createInvoice(
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Invoice generated successfully',
            invoice,
            201
        );
    } catch (error) {
        next(error);
    }
};

const getInvoices = async (req, res, next) => {
    try {
        const invoices = await billingService.getInvoices(req.query);
        return ApiResponse.success(
            res,
            'Invoices retrieved successfully',
            invoices
        );
    } catch (error) {
        next(error);
    }
};

const getInvoiceById = async (req, res, next) => {
    try {
        const invoice = await billingService.getInvoiceById(req.params.id);
        return ApiResponse.success(
            res,
            'Invoice retrieved successfully',
            invoice
        );
    } catch (error) {
        next(error);
    }
};

const recordPayment = async (req, res, next) => {
    try {
        const invoice = await billingService.recordPayment(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Payment recorded successfully',
            invoice
        );
    } catch (error) {
        next(error);
    }
};

const updateInvoiceStatus = async (req, res, next) => {
    try {
        const invoice = await billingService.updateInvoiceStatus(
            req.params.id,
            req.body.status,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Invoice status updated successfully',
            invoice
        );
    } catch (error) {
        next(error);
    }
};

const getBillingDashboard = async (req, res, next) => {
    try {
        const dashboard = await billingService.getBillingDashboard();
        return ApiResponse.success(
            res,
            'Billing dashboard retrieved successfully',
            dashboard
        );
    } catch (error) {
        next(error);
    }
};

const emailInvoice = async (req, res, next) => {
    try {
        const invoice = await billingService.emailInvoice(
            req.params.id,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Invoice sent via email successfully',
            invoice
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    recordPayment,
    updateInvoiceStatus,
    getBillingDashboard,
    emailInvoice
};
