const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        companyName: {
            type: String,
            default: ''
        },
        mobile: {
            type: String,
            required: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true
        },
        category: {
            type: String,
            enum: ['Enterprise', 'SME', 'Individual'],
            default: 'SME'
        },
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            default: null
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
