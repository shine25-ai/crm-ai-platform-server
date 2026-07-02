const mongoose = require('mongoose');

const employeeAssetSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true
        },
        assetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            required: true,
            index: true
        },
        assignedDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        expectedReturnDate: {
            type: Date,
            default: null
        },
        actualReturnDate: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ['Assigned', 'Returned', 'Lost', 'Damaged', 'Under Repair'],
            default: 'Assigned',
            index: true
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        remarks: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('EmployeeAsset', employeeAssetSchema);
