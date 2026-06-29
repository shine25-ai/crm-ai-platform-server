const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
    {
        leadNumber: {
            type: String,
            unique: true,
            required: true
        },
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
            required: true,
            index: true
        },
        alternateMobile: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            index: true
        },
        website: {
            type: String,
            default: ''
        },
        source: {
            type: String,
            enum: [
                'Website',
                'Referral',
                'Cold Call',
                'Social Media',
                'Partner',
                'Email Campaign',
                'Other'
            ],
            default: 'Other'
        },
        status: {
            type: String,
            enum: [
                'New',
                'Assigned',
                'Contacted',
                'Qualified',
                'Proposal Sent',
                'Negotiation',
                'Won',
                'Lost',
                'Converted'
            ],
            default: 'New',
            index: true
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium',
            index: true
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },
        industry: {
            type: String,
            default: ''
        },
        address: {
            street: { type: String, default: '' },
            city: { type: String, default: '' },
            state: { type: String, default: '' },
            zip: { type: String, default: '' },
            country: { type: String, default: '' }
        },
        requirements: {
            businessRequirement: { type: String, default: '' },
            productInterest: { type: String, default: '' },
            estimatedBudget: { type: Number, default: 0 },
            expectedTimeline: { type: String, default: '' }
        },
        contactDesignation: {
            type: String,
            default: ''
        },
        companySize: {
            type: String,
            default: ''
        },
        companyAddress: {
            type: String,
            default: ''
        },
        convertedCustomerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null
        },
        convertedAt: {
            type: Date,
            default: null
        },
        convertedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },
        deletedAt: {
            type: Date,
            default: null
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

leadSchema.index({ name: 'text', companyName: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
