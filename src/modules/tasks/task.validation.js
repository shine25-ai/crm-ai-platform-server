const AppError = require('../../shared/utils/appError');

/**
 * Validate fields for task creation
 */
const validateCreateTask = (data) => {
    if (!data.title || !data.title.trim()) {
        throw new AppError('Title is required', 400);
    }
    if (!data.description || !data.description.trim()) {
        throw new AppError('Description is required', 400);
    }
    if (!data.assignedTo) {
        throw new AppError('Assignee is required', 400);
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (data.priority && !validPriorities.includes(data.priority)) {
        throw new AppError(
            `Priority must be one of: ${validPriorities.join(', ')}`,
            400
        );
    }

    if (data.dueDate) {
        const due = new Date(data.dueDate);
        if (isNaN(due.getTime())) {
            throw new AppError('Invalid due date format', 400);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (due < today) {
            throw new AppError('Due date cannot be in the past', 400);
        }
    }
};

/**
 * Validate fields for task update
 */
const validateUpdateTask = (data) => {
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const validStatuses = [
        'Open',
        'In Progress',
        'On Hold',
        'Completed',
        'Cancelled'
    ];

    if (data.title !== undefined && !data.title.trim()) {
        throw new AppError('Title cannot be empty', 400);
    }
    if (data.priority && !validPriorities.includes(data.priority)) {
        throw new AppError(
            `Priority must be one of: ${validPriorities.join(', ')}`,
            400
        );
    }
    if (data.status && !validStatuses.includes(data.status)) {
        throw new AppError(
            `Status must be one of: ${validStatuses.join(', ')}`,
            400
        );
    }
    if (data.progress !== undefined) {
        const p = parseInt(data.progress);
        if (isNaN(p) || p < 0 || p > 100) {
            throw new AppError('Progress must be between 0 and 100', 400);
        }
    }
    if (data.dueDate) {
        const due = new Date(data.dueDate);
        if (isNaN(due.getTime())) {
            throw new AppError('Invalid due date format', 400);
        }
    }
};

module.exports = { validateCreateTask, validateUpdateTask };
