const customerService = require('./customer.service');
const { validateCreateCustomer } = require('./customer.validation');
const ApiResponse = require('../../shared/utils/response');

const getCustomers = async (req, res, next) => {
    try {
        const result = await customerService.listCustomers(req.user, req.query);
        return ApiResponse.success(
            res,
            'Customers retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const getCustomer = async (req, res, next) => {
    try {
        const result = await customerService.getCustomerById(req.params.id);
        return ApiResponse.success(
            res,
            'Customer retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        validateCreateCustomer(req.body);
        const customer = await customerService.createCustomer(
            req.body,
            req.user
        );
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

const getOpportunities = async (req, res, next) => {
    try {
        const result = await customerService.listOpportunities(
            req.user,
            req.query
        );
        return ApiResponse.success(
            res,
            'Opportunities retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomers,
    getCustomer,
    createCustomer,
    getOpportunities
};
