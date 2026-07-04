const mongoose = require('mongoose');

const assetAssignmentHistorySchema = new mongoose.Schema({
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    actionType: {
        type: String,
        enum: [
            'Assigned',
            'Returned',
            'Reassigned',
            'Lost',
            'Damaged',
            'Under Repair',
            'Issue Reported'
        ],
        required: true,
        index: true
    },
    previousStatus: {
        type: String,
        default: ''
    },
    currentStatus: {
        type: String,
        default: ''
    },
    actionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    remarks: {
        type: String,
        default: ''
    },
    actionDate: {
        type: Date,
        required: true,
        default: Date.now
    }
});

module.exports = mongoose.model(
    'AssetAssignmentHistory',
    assetAssignmentHistorySchema
);
