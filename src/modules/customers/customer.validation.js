const AppError = require('../../shared/utils/appError');

const validateCreateCustomer = (data) => {
    if (!data.name || !data.name.trim()) {
        throw new AppError('Customer name is required', 400);
    }
    if (!data.mobile || !data.mobile.trim()) {
        throw new AppError('Mobile number is required', 400);
    }

    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new AppError('Invalid email format', 400);
        }
    }

    const validCategories = ['Enterprise', 'SME', 'Individual'];
    if (data.category && !validCategories.includes(data.category)) {
        throw new AppError(
            `Category must be one of: ${validCategories.join(', ')}`,
            400
        );
    }
};

const validateCreateOpportunity = (data) => {
    if (!data.name || !data.name.trim()) {
        throw new AppError('Opportunity name is required', 400);
    }
    if (data.dealValue === undefined || isNaN(Number(data.dealValue))) {
        throw new AppError('Deal value must be a valid number', 400);
    }
    if (!data.expectedClosingDate) {
        throw new AppError('Expected closing date is required', 400);
    }
    const closing = new Date(data.expectedClosingDate);
    if (isNaN(closing.getTime())) {
        throw new AppError('Invalid expected closing date format', 400);
    }

    const validStages = [
        'Prospecting',
        'Qualification',
        'Proposal',
        'Negotiation',
        'Closed Won',
        'Closed Lost'
    ];
    if (data.stage && !validStages.includes(data.stage)) {
        throw new AppError(
            `Stage must be one of: ${validStages.join(', ')}`,
            400
        );
    }

    if (data.probability !== undefined) {
        const prob = parseInt(data.probability);
        if (isNaN(prob) || prob < 0 || prob > 100) {
            throw new AppError('Probability must be between 0 and 100', 400);
        }
    }
};

module.exports = {
    validateCreateCustomer,
    validateCreateOpportunity
};
