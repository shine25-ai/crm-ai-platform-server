const Customer = require('./customer.model');
const Opportunity = require('./opportunity.model');
const AppError = require('../../shared/utils/appError');
const {
    logActivity,
    logAudit
} = require('../../shared/services/audit.service');

const listCustomers = async (user, filters = {}) => {
    const query = {};

    if (filters.search) {
        const searchRegex = { $regex: filters.search, $options: 'i' };
        query.$or = [
            { name: searchRegex },
            { companyName: searchRegex },
            { mobile: searchRegex },
            { email: searchRegex }
        ];
    }

    if (filters.category) {
        query.category = filters.category;
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
        Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Customer.countDocuments(query)
    ]);

    return {
        customers,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

const getCustomerById = async (id) => {
    const customer = await Customer.findById(id);
    if (!customer) throw new AppError('Customer not found', 404);

    const opportunities = await Opportunity.find({ customerId: id }).populate(
        'assignedTo',
        'name'
    );
    return {
        customer,
        opportunities
    };
};

const createCustomer = async (data, user) => {
    const customer = await Customer.create({
        name: data.name.trim(),
        companyName: data.companyName ? data.companyName.trim() : '',
        mobile: data.mobile.trim(),
        email: data.email ? data.email.toLowerCase().trim() : '',
        category: data.category || 'SME',
        createdBy: user.userId
    });

    await logActivity(
        user.userId,
        'CREATE',
        'Customers',
        `Created customer "${customer.name}"`
    );
    return customer;
};

const listOpportunities = async (user, filters = {}) => {
    const query = {};

    if (filters.stage) {
        query.stage = filters.stage;
    }

    if (filters.search) {
        query.name = { $regex: filters.search, $options: 'i' };
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const skip = (page - 1) * limit;

    const [opportunities, total] = await Promise.all([
        Opportunity.find(query)
            .populate('customerId', 'name companyName')
            .populate('assignedTo', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Opportunity.countDocuments(query)
    ]);

    return {
        opportunities,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

module.exports = {
    listCustomers,
    getCustomerById,
    createCustomer,
    listOpportunities
};
