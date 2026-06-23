const customerService = require('./customer.service');
const ApiResponse = require('../../shared/utils/response');

const listCustomers = async (req, res, next) => {
    try {
        const customers = await customerService.listCustomers(req.query);
        return ApiResponse.success(
            res,
            'Customers retrieved successfully',
            customers
        );
    } catch (error) {
        next(error);
    }
};

const getCustomer = async (req, res, next) => {
    try {
        const customer = await customerService.getCustomerById(req.params.id);
        return ApiResponse.success(
            res,
            'Customer retrieved successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const customer = await customerService.createCustomer(req.body);
        return ApiResponse.success(
            res,
            'Customer created successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        const customer = await customerService.updateCustomer(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Customer updated successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const deleteCustomer = async (req, res, next) => {
    try {
        const result = await customerService.deleteCustomer(req.params.id);
        return ApiResponse.success(
            res,
            'Customer deleted successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const addContact = async (req, res, next) => {
    try {
        const customer = await customerService.addContact(
            req.params.id,
            req.body
        );
        return ApiResponse.success(res, 'Contact added successfully', customer);
    } catch (error) {
        next(error);
    }
};

const updateContact = async (req, res, next) => {
    try {
        const customer = await customerService.updateContact(
            req.params.id,
            req.params.contactId,
            req.body
        );
        return ApiResponse.success(
            res,
            'Contact updated successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const deleteContact = async (req, res, next) => {
    try {
        const customer = await customerService.deleteContact(
            req.params.id,
            req.params.contactId
        );
        return ApiResponse.success(
            res,
            'Contact deleted successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const uploadDocument = async (req, res, next) => {
    try {
        const customer = await customerService.uploadDocument(
            req.params.id,
            req.file,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Document uploaded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const deleteDocument = async (req, res, next) => {
    try {
        const customer = await customerService.deleteDocument(
            req.params.id,
            req.params.documentId
        );
        return ApiResponse.success(
            res,
            'Document deleted successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const addFollowUp = async (req, res, next) => {
    try {
        const customer = await customerService.addFollowUp(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Follow-up recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addMeeting = async (req, res, next) => {
    try {
        const customer = await customerService.addMeeting(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Meeting recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addTransaction = async (req, res, next) => {
    try {
        const customer = await customerService.addTransaction(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Transaction recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addOpportunity = async (req, res, next) => {
    try {
        const customer = await customerService.addOpportunity(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Opportunity recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addContact,
    updateContact,
    deleteContact,
    uploadDocument,
    deleteDocument,
    addFollowUp,
    addMeeting,
    addTransaction,
    addOpportunity
};
