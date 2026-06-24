const AppError = require('../../shared/utils/appError');

const validateCreateLead = (data) => {
    if (!data.name || !data.name.trim()) {
        throw new AppError('Lead name is required', 400);
    }
    if (!data.mobile || !data.mobile.trim()) {
        throw new AppError('Mobile number is required', 400);
    }

    // Email regex
    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new AppError('Invalid email format', 400);
        }
    }

    // Phone regex - basic check
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanMobile = data.mobile.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanMobile)) {
        throw new AppError('Invalid mobile number format', 400);
    }

    const validSources = [
        'Website',
        'Referral',
        'Cold Call',
        'Social Media',
        'Partner',
        'Email Campaign',
        'Other'
    ];
    if (data.source && !validSources.includes(data.source)) {
        throw new AppError(
            `Source must be one of: ${validSources.join(', ')}`,
            400
        );
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (data.priority && !validPriorities.includes(data.priority)) {
        throw new AppError(
            `Priority must be one of: ${validPriorities.join(', ')}`,
            400
        );
    }
};

const validateUpdateLead = (data) => {
    if (data.name !== undefined && !data.name.trim()) {
        throw new AppError('Lead name cannot be empty', 400);
    }
    if (data.mobile !== undefined && !data.mobile.trim()) {
        throw new AppError('Mobile number cannot be empty', 400);
    }

    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            throw new AppError('Invalid email format', 400);
        }
    }

    if (data.mobile) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        const cleanMobile = data.mobile.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanMobile)) {
            throw new AppError('Invalid mobile number format', 400);
        }
    }

    const validStatuses = [
        'New',
        'Assigned',
        'Contacted',
        'Qualified',
        'Proposal Sent',
        'Negotiation',
        'Won',
        'Lost',
        'Converted'
    ];
    if (data.status && !validStatuses.includes(data.status)) {
        throw new AppError(
            `Status must be one of: ${validStatuses.join(', ')}`,
            400
        );
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (data.priority && !validPriorities.includes(data.priority)) {
        throw new AppError(
            `Priority must be one of: ${validPriorities.join(', ')}`,
            400
        );
    }
};

const validateCreateFollowUp = (data) => {
    if (!data.followUpDate) {
        throw new AppError('Follow-up date is required', 400);
    }
    const date = new Date(data.followUpDate);
    if (isNaN(date.getTime())) {
        throw new AppError('Invalid follow-up date format', 400);
    }
    if (!data.type) {
        throw new AppError('Follow-up type is required', 400);
    }
    const validTypes = ['Call', 'Email', 'Meeting', 'Other'];
    if (!validTypes.includes(data.type)) {
        throw new AppError(
            `Follow-up type must be one of: ${validTypes.join(', ')}`,
            400
        );
    }
};

const validateCreateMeeting = (data) => {
    if (!data.meetingDate) {
        throw new AppError('Meeting date is required', 400);
    }
    const date = new Date(data.meetingDate);
    if (isNaN(date.getTime())) {
        throw new AppError('Invalid meeting date format', 400);
    }
};

module.exports = {
    validateCreateLead,
    validateUpdateLead,
    validateCreateFollowUp,
    validateCreateMeeting
};
