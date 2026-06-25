const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        country: { type: String, default: '' }
    },
    { _id: false }
);

const contactSchema = new mongoose.Schema(
    {
        contactName: { type: String, required: true, trim: true },
        designation: { type: String, default: '' },
        department: { type: String, default: '' },
        mobileNumber: { type: String, default: '' },
        email: { type: String, default: '', lowercase: true, trim: true },
        isPrimaryContact: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const documentSchema = new mongoose.Schema(
    {
        documentName: { type: String, required: true },
        documentType: { type: String, required: true },
        fileName: { type: String, required: true },
        filePath: { type: String, required: true },
        fileSize: { type: Number, default: 0 },
        mimeType: { type: String, default: '' },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        uploadedDate: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const timelineSchema = new mongoose.Schema(
    {
        title: { type: String, default: '' },
        note: { type: String, default: '' },
        date: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

const opportunitySchema = new mongoose.Schema(
    {
        title: { type: String, default: '' },
        value: { type: Number, default: 0 },
        stage: { type: String, default: 'Open' },
        expectedCloseDate: { type: Date, default: null }
    },
    { timestamps: true }
);

const transactionSchema = new mongoose.Schema(
    {
        title: { type: String, default: '' },
        amount: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
        status: { type: String, default: 'Completed' }
    },
    { timestamps: true }
);

const milestoneSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        percentage: { type: Number, default: 0 },
        dueDate: { type: Date, default: null },
        status: {
            type: String,
            enum: ['Pending', 'Invoiced', 'Paid'],
            default: 'Pending'
        }
    },
    { _id: true }
);

const taxSchema = new mongoose.Schema(
    {
        label: { type: String, default: 'GST' },
        rate: { type: Number, default: 18 },
        amount: { type: Number, default: 0 }
    },
    { _id: false }
);

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: { type: String, required: true },
        projectName: { type: String, default: '' },
        invoiceDate: { type: Date, default: Date.now },
        dueDate: { type: Date, default: null },
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
            default: 'Pending'
        },
        amount: { type: Number, default: 0 },
        taxableAmount: { type: Number, default: 0 },
        taxDetails: { type: taxSchema, default: () => ({}) },
        totalAmount: { type: Number, default: 0 },
        milestoneName: { type: String, default: '' },
        billingFrequency: { type: String, default: '' },
        notes: { type: String, default: '' }
    },
    { timestamps: true }
);

const paymentRecordSchema = new mongoose.Schema(
    {
        invoiceNumber: { type: String, default: '' },
        paymentDate: { type: Date, default: Date.now },
        amount: { type: Number, default: 0 },
        paymentMode: { type: String, default: 'Bank Transfer' },
        referenceNumber: { type: String, default: '' },
        notes: { type: String, default: '' }
    },
    { timestamps: true }
);

const contractDocumentSchema = new mongoose.Schema(
    {
        documentName: { type: String, required: true },
        documentType: { type: String, default: 'Contract' },
        fileName: { type: String, default: '' },
        filePath: { type: String, default: '' },
        uploadedDate: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const projectEngagementSchema = new mongoose.Schema(
    {
        projectName: { type: String, required: true },
        projectValue: { type: Number, default: 0 },
        contractStartDate: { type: Date, default: null },
        contractEndDate: { type: Date, default: null },
        billingFrequency: {
            type: String,
            enum: ['Milestone', 'Monthly', 'Quarterly', 'Annual'],
            default: 'Milestone'
        },
        paymentTerms: { type: String, default: '' },
        milestones: { type: [milestoneSchema], default: [] },
        invoices: { type: [invoiceSchema], default: [] },
        payments: { type: [paymentRecordSchema], default: [] },
        contractDocuments: { type: [contractDocumentSchema], default: [] },
        status: {
            type: String,
            enum: ['Active', 'Completed', 'On Hold', 'Cancelled'],
            default: 'Active'
        }
    },
    { timestamps: true }
);

const customerSchema = new mongoose.Schema(
    {
        customerName: { type: String, required: true, trim: true, index: true },
        companyName: { type: String, default: '', trim: true, index: true },
        mobileNumber: { type: String, default: '' },
        email: { type: String, default: '', lowercase: true, trim: true },
        customerType: {
            type: String,
            enum: ['Individual', 'Company', 'Partner', 'Reseller'],
            default: 'Company'
        },
        status: {
            type: String,
            enum: ['Prospect', 'Active', 'Inactive', 'Blocked'],
            default: 'Prospect'
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        gstNumber: { type: String, default: '' },
        panNumber: { type: String, default: '' },
        billingAddress: { type: addressSchema, default: () => ({}) },
        shippingAddress: { type: addressSchema, default: () => ({}) },
        revenueSummary: {
            totalRevenue: { type: Number, default: 0 },
            outstandingAmount: { type: Number, default: 0 },
            lastTransactionDate: { type: Date, default: null }
        },
        orderSummary: {
            totalOrders: { type: Number, default: 0 },
            lastOrderDate: { type: Date, default: null },
            transactions: { type: [transactionSchema], default: [] }
        },
        openOpportunities: { type: [opportunitySchema], default: [] },
        followUps: { type: [timelineSchema], default: [] },
        meetings: { type: [timelineSchema], default: [] },
        contacts: { type: [contactSchema], default: [] },
        documents: { type: [documentSchema], default: [] },
        projectEngagements: { type: [projectEngagementSchema], default: [] }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
