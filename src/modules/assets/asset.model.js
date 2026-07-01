const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
    {
        assetName: {
            type: String,
            required: true,
            trim: true
        },
        assetCategory: {
            type: String,
            required: true,
            trim: true
        },
        assetTag: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        serialNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        model: {
            type: String,
            default: ''
        },
        brand: {
            type: String,
            default: ''
        },
        purchaseDate: {
            type: Date,
            default: null
        },
        warrantyExpiry: {
            type: Date,
            default: null
        },
        currentStatus: {
            type: String,
            enum: [
                'Available',
                'Assigned',
                'Returned',
                'Lost',
                'Damaged',
                'Under Repair'
            ],
            default: 'Available',
            index: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
