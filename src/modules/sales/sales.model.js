const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
    {
        opportunityName: { type: String, required: true, trim: true },
        relatedType: {
            type: String,
            enum: ['Lead', 'Customer'],
            default: 'Customer'
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null
        },
        leadName: { type: String, default: '' },
        dealValue: { type: Number, default: 0 },
        stage: {
            type: String,
            enum: [
                'Qualification',
                'Discovery',
                'Proposal',
                'Negotiation',
                'Won',
                'Lost'
            ],
            default: 'Qualification'
        },
        probability: { type: Number, default: 10 },
        expectedClosingDate: { type: Date, default: null },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        status: {
            type: String,
            enum: ['Open', 'Won', 'Lost', 'On Hold'],
            default: 'Open'
        },
        notes: { type: String, default: '' }
    },
    { timestamps: true }
);

opportunitySchema.virtual('expectedRevenue').get(function getExpectedRevenue() {
    return Math.round(
        (Number(this.dealValue || 0) * Number(this.probability || 0)) / 100
    );
});
opportunitySchema.set('toJSON', { virtuals: true });
opportunitySchema.set('toObject', { virtuals: true });

const quotationItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        taxRate: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    { _id: true }
);

const quotationSchema = new mongoose.Schema(
    {
        quotationNumber: { type: String, required: true, unique: true },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true
        },
        opportunityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SalesOpportunity',
            default: null
        },
        quotationDate: { type: Date, default: Date.now },
        validUntil: { type: Date, default: null },
        items: { type: [quotationItemSchema], default: [] },
        subTotal: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'],
            default: 'Draft'
        },
        sentAt: { type: Date, default: null }
    },
    { timestamps: true }
);

const followUpSchema = new mongoose.Schema(
    {
        relatedType: {
            type: String,
            enum: ['Lead', 'Customer', 'Opportunity'],
            default: 'Customer'
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null
        },
        opportunityId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SalesOpportunity',
            default: null
        },
        leadName: { type: String, default: '' },
        followUpType: {
            type: String,
            enum: ['Call', 'Email', 'Meeting', 'Demo', 'Task'],
            default: 'Call'
        },
        followUpDate: { type: Date, required: true },
        followUpTime: { type: String, default: '' },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Urgent'],
            default: 'Medium'
        },
        notes: { type: String, default: '' },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Rescheduled', 'Cancelled'],
            default: 'Pending'
        }
    },
    { timestamps: true }
);

const meetingSchema = new mongoose.Schema(
    {
        meetingTitle: { type: String, required: true },
        relatedType: {
            type: String,
            enum: ['Lead', 'Customer'],
            default: 'Customer'
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null
        },
        leadName: { type: String, default: '' },
        meetingDate: { type: Date, required: true },
        startTime: { type: String, default: '' },
        endTime: { type: String, default: '' },
        meetingType: {
            type: String,
            enum: ['Online', 'In Person', 'Phone'],
            default: 'Online'
        },
        locationOrLink: { type: String, default: '' },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        meetingNotes: { type: String, default: '' },
        outcome: { type: String, default: '' },
        status: {
            type: String,
            enum: ['Scheduled', 'Completed', 'Cancelled'],
            default: 'Scheduled'
        }
    },
    { timestamps: true }
);

module.exports = {
    SalesOpportunity: mongoose.model('SalesOpportunity', opportunitySchema),
    SalesQuotation: mongoose.model('SalesQuotation', quotationSchema),
    SalesFollowUp: mongoose.model('SalesFollowUp', followUpSchema),
    SalesMeeting: mongoose.model('SalesMeeting', meetingSchema)
};
