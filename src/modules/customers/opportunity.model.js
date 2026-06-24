const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        },
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            default: null
        },
        dealValue: {
            type: Number,
            required: true
        },
        expectedClosingDate: {
            type: Date,
            required: true
        },
        probability: {
            type: Number,
            min: 0,
            max: 100,
            default: 20
        },
        expectedRevenue: {
            type: Number,
            default: 0
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        stage: {
            type: String,
            enum: [
                'Prospecting',
                'Qualification',
                'Proposal',
                'Negotiation',
                'Closed Won',
                'Closed Lost'
            ],
            default: 'Prospecting'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
