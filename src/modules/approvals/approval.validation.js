const AppError = require('../../shared/utils/appError');

const validateCreateApproval = (data) => {
    if (!data.requestType || !data.requestType.trim()) {
        throw new AppError('Request type is required', 400);
    }
    const validTypes = [
        'Leave Request',
        'Attendance Correction',
        'Expense Claim',
        'Profile Update',
        'Overtime Request',
        'Asset Request',
        'Travel Request',
        'Document Request',
        'Custom Request'
    ];
    if (!validTypes.includes(data.requestType)) {
        throw new AppError(
            `Request type must be one of: ${validTypes.join(', ')}`,
            400
        );
    }
    if (!data.title || !data.title.trim()) {
        throw new AppError('Title is required', 400);
    }
    if (!data.description || !data.description.trim()) {
        throw new AppError('Description is required', 400);
    }
    if (!data.effectiveDate) {
        throw new AppError('Effective date is required', 400);
    }
    const effDate = new Date(data.effectiveDate);
    if (isNaN(effDate.getTime())) {
        throw new AppError('Invalid effective date format', 400);
    }

    // Type specific checks
    if (data.requestType === 'Expense Claim') {
        if (
            data.requestedAmount === undefined ||
            data.requestedAmount === null
        ) {
            throw new AppError(
                'Requested amount is required for Expense Claims',
                400
            );
        }
        const amt = parseFloat(data.requestedAmount);
        if (isNaN(amt) || amt <= 0) {
            throw new AppError(
                'Requested amount must be a positive number',
                400
            );
        }
    }

    if (data.requestType === 'Leave Request') {
        const reqData = data.requestData || {};
        if (!reqData.startDate) {
            throw new AppError(
                'Start date is required in requestData for Leave Requests',
                400
            );
        }
        if (!reqData.endDate) {
            throw new AppError(
                'End date is required in requestData for Leave Requests',
                400
            );
        }
        if (!reqData.leaveType) {
            if (reqData.leaveTypeId || reqData.leaveTypeName) return;
            throw new AppError(
                'Leave type is required in requestData for Leave Requests',
                400
            );
        }
    }

    if (data.requestType === 'Attendance Correction') {
        const reqData = data.requestData || {};
        if (!reqData.date) {
            throw new AppError(
                'Target date is required in requestData for Attendance Correction',
                400
            );
        }
        if (!reqData.clockInCorrection) {
            throw new AppError(
                'Clock-in correction is required in requestData for Attendance Correction',
                400
            );
        }
        if (!reqData.clockOutCorrection) {
            throw new AppError(
                'Clock-out correction is required in requestData for Attendance Correction',
                400
            );
        }
    }
};

const validateApprovalAction = (data) => {
    if (!data.action) {
        throw new AppError('Action is required', 400);
    }
    const validActions = [
        'Approve',
        'Reject',
        'Escalate',
        'Reassign',
        'Cancel'
    ];
    if (!validActions.includes(data.action)) {
        throw new AppError(
            `Action must be one of: ${validActions.join(', ')}`,
            400
        );
    }
    if (data.action === 'Reject' && (!data.comments || !data.comments.trim())) {
        throw new AppError('Rejection comments are mandatory', 400);
    }
    if (data.action === 'Reassign' && !data.targetApproverId) {
        throw new AppError(
            'Target approver ID is required for reassignment',
            400
        );
    }
};

const validateCreateWorkflow = (data) => {
    if (!data.workflowName || !data.workflowName.trim()) {
        throw new AppError('Workflow name is required', 400);
    }
    if (!data.requestType) {
        throw new AppError('Request type is required', 400);
    }
    if (
        !data.stages ||
        !Array.isArray(data.stages) ||
        data.stages.length === 0
    ) {
        throw new AppError(
            'Workflow must have at least one stage configuration stage',
            400
        );
    }

    data.stages.forEach((stage, idx) => {
        if (!stage.stageNumber || typeof stage.stageNumber !== 'number') {
            throw new AppError(
                `Stage at index ${idx} must have a valid stageNumber`,
                400
            );
        }
        if (!stage.stageName || !stage.stageName.trim()) {
            throw new AppError(
                `Stage at index ${idx} must have a stageName`,
                400
            );
        }
        const validRoles = [
            'MANAGER',
            'DEPARTMENT_HEAD',
            'HR',
            'ADMIN',
            'SPECIFIC_USER'
        ];
        if (!stage.approverRole || !validRoles.includes(stage.approverRole)) {
            throw new AppError(
                `Stage at index ${idx} must have a valid approverRole: ${validRoles.join(', ')}`,
                400
            );
        }
        if (
            stage.approverRole === 'SPECIFIC_USER' &&
            !stage.specificApproverId
        ) {
            throw new AppError(
                `Stage at index ${idx} specifies SPECIFIC_USER but specificApproverId is missing`,
                400
            );
        }
    });
};

module.exports = {
    validateCreateApproval,
    validateApprovalAction,
    validateCreateWorkflow
};
