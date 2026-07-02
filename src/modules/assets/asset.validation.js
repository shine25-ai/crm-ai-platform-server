const AppError = require('../../shared/utils/appError');

const validateCreateAsset = (data) => {
    if (!data.assetName || !data.assetName.trim()) {
        throw new AppError('Asset name is required', 400);
    }
    if (!data.assetCategory || !data.assetCategory.trim()) {
        throw new AppError('Asset category is required', 400);
    }
    if (!data.assetTag || !data.assetTag.trim()) {
        throw new AppError('Asset tag is required', 400);
    }
    if (!data.serialNumber || !data.serialNumber.trim()) {
        throw new AppError('Serial number is required', 400);
    }
};

const validateUpdateAsset = (data) => {
    if (data.assetName !== undefined && !data.assetName.trim()) {
        throw new AppError('Asset name cannot be empty', 400);
    }
    if (data.assetCategory !== undefined && !data.assetCategory.trim()) {
        throw new AppError('Asset category cannot be empty', 400);
    }
    if (data.assetTag !== undefined && !data.assetTag.trim()) {
        throw new AppError('Asset tag cannot be empty', 400);
    }
    if (data.serialNumber !== undefined && !data.serialNumber.trim()) {
        throw new AppError('Serial number cannot be empty', 400);
    }
    const validStatuses = [
        'Available',
        'Assigned',
        'Returned',
        'Lost',
        'Damaged',
        'Under Repair'
    ];
    if (data.currentStatus && !validStatuses.includes(data.currentStatus)) {
        throw new AppError(
            `Current status must be one of: ${validStatuses.join(', ')}`,
            400
        );
    }
};

const validateAssignAsset = (data) => {
    if (!data.assetId) {
        throw new AppError('Asset ID is required for assignment', 400);
    }
    if (data.assignedDate) {
        const date = new Date(data.assignedDate);
        if (isNaN(date.getTime())) {
            throw new AppError('Invalid assigned date format', 400);
        }
    }
    if (data.expectedReturnDate) {
        const date = new Date(data.expectedReturnDate);
        if (isNaN(date.getTime())) {
            throw new AppError('Invalid expected return date format', 400);
        }
        if (
            data.assignedDate &&
            new Date(data.expectedReturnDate) < new Date(data.assignedDate)
        ) {
            throw new AppError(
                'Expected return date cannot be before assigned date',
                400
            );
        }
    }
};

const validateReturnAsset = (data) => {
    if (data.returnDate) {
        const date = new Date(data.returnDate);
        if (isNaN(date.getTime())) {
            throw new AppError('Invalid return date format', 400);
        }
    }
    const validStatuses = ['Returned', 'Lost', 'Damaged', 'Under Repair'];
    if (data.status && !validStatuses.includes(data.status)) {
        throw new AppError(
            `Return status must be one of: ${validStatuses.join(', ')}`,
            400
        );
    }
    // Remarks are mandatory for Lost, Damaged, Under Repair
    if (
        ['Lost', 'Damaged', 'Under Repair'].includes(data.status) &&
        (!data.remarks || !data.remarks.trim())
    ) {
        throw new AppError(
            `Remarks are required when marking asset as ${data.status}`,
            400
        );
    }
};

module.exports = {
    validateCreateAsset,
    validateUpdateAsset,
    validateAssignAsset,
    validateReturnAsset
};
