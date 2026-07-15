const mongoose = require('mongoose');

const featureFlagsSchema = new mongoose.Schema(
    {
        aiAssistant: { type: Boolean, default: false },
        automations: { type: Boolean, default: false },
        emailTemplates: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
        analytics: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        crm: { type: Boolean, default: true },
        hr: { type: Boolean, default: true },
        attendance: { type: Boolean, default: true },
        projects: { type: Boolean, default: true },
        billing: { type: Boolean, default: true },
        gpsTracking: { type: Boolean, default: false },
        chat: { type: Boolean, default: true },
        documents: { type: Boolean, default: true },
        storage: { type: Boolean, default: true },
        assets: { type: Boolean, default: true },
        expenses: { type: Boolean, default: true }
    },
    { _id: false }
);

const usageLimitsSchema = new mongoose.Schema(
    {
        maxUsers: { type: Number, default: 10 },
        maxEmployees: { type: Number, default: 25 },
        maxLeads: { type: Number, default: 1000 },
        maxCustomers: { type: Number, default: 250 },
        maxStorageGB: { type: Number, default: 5 },
        maxAIRequestsPerMonth: { type: Number, default: 0 },
        maxWorkflowRunsPerMonth: { type: Number, default: 100 },
        maxWhatsappMessagesPerMonth: { type: Number, default: 0 },
        maxEmailSendsPerMonth: { type: Number, default: 1000 },
        maxReportExportsPerMonth: { type: Number, default: 50 }
    },
    { _id: false }
);

const companySchema = new mongoose.Schema(
    {
        companyName: { type: String, required: true, trim: true },
        legalName: { type: String, default: '', trim: true },
        ownerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        status: {
            type: String,
            enum: ['trial', 'active', 'suspended', 'cancelled', 'archived'],
            default: 'trial',
            index: true
        },
        domain: { type: String, default: '', trim: true, lowercase: true },
        subdomain: { type: String, default: '', trim: true, lowercase: true },
        timezone: { type: String, default: 'Asia/Calcutta', trim: true },
        locale: { type: String, default: 'en-IN', trim: true },
        currency: { type: String, default: 'INR', trim: true },
        billingContact: {
            name: { type: String, default: '', trim: true },
            email: { type: String, default: '', trim: true, lowercase: true },
            phone: { type: String, default: '', trim: true }
        },
        address: {
            line1: { type: String, default: '' },
            line2: { type: String, default: '' },
            city: { type: String, default: '' },
            state: { type: String, default: '' },
            country: { type: String, default: 'India' },
            postalCode: { type: String, default: '' }
        },
        taxId: { type: String, default: '', trim: true },
        logo: { type: String, default: '' },
        featureSettings: { type: featureFlagsSchema, default: () => ({}) },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true, tenantScoped: false }
);

companySchema.index(
    { domain: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { domain: { $gt: '' } }
    }
);
companySchema.index(
    { subdomain: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { subdomain: { $gt: '' } }
    }
);

const planSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        description: { type: String, default: '' },
        price: { type: Number, default: 0 },
        currency: { type: String, default: 'INR', trim: true },
        billingInterval: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly'
        },
        trialDays: { type: Number, default: 14 },
        status: {
            type: String,
            enum: ['active', 'archived'],
            default: 'active',
            index: true
        },
        featureFlags: { type: featureFlagsSchema, default: () => ({}) },
        usageLimits: { type: usageLimitsSchema, default: () => ({}) },
        providerPriceIds: {
            stripe: { type: String, default: '' },
            razorpay: { type: String, default: '' }
        },
        sortOrder: { type: Number, default: 0 }
    },
    { timestamps: true, tenantScoped: false }
);

const subscriptionSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            required: true
        },
        status: {
            type: String,
            enum: [
                'trialing',
                'active',
                'past_due',
                'cancelled',
                'expired',
                'suspended'
            ],
            default: 'trialing',
            index: true
        },
        provider: {
            type: String,
            enum: ['stripe', 'razorpay', 'manual'],
            default: 'manual'
        },
        providerCustomerId: { type: String, default: '' },
        providerSubscriptionId: { type: String, default: '' },
        currentPeriodStart: { type: Date, default: Date.now },
        currentPeriodEnd: { type: Date, default: null },
        trialStart: { type: Date, default: Date.now },
        trialEnd: { type: Date, default: null },
        cancelAtPeriodEnd: { type: Boolean, default: false },
        cancelledAt: { type: Date, default: null },
        billingInterval: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly'
        },
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        billingOverride: { type: Boolean, default: false },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    { timestamps: true, tenantScoped: false }
);

subscriptionSchema.index({ companyId: 1, status: 1 });

const companyInvoiceSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription',
            default: null
        },
        provider: {
            type: String,
            enum: ['stripe', 'razorpay', 'manual'],
            default: 'manual'
        },
        providerInvoiceId: { type: String, default: '' },
        invoiceNumber: { type: String, required: true, unique: true },
        amount: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        status: {
            type: String,
            enum: ['draft', 'open', 'paid', 'failed', 'void', 'refunded'],
            default: 'open',
            index: true
        },
        invoiceUrl: { type: String, default: '' },
        pdfUrl: { type: String, default: '' },
        dueDate: { type: Date, default: null },
        paidAt: { type: Date, default: null },
        lineItems: { type: [mongoose.Schema.Types.Mixed], default: [] }
    },
    { timestamps: true, tenantScoped: false }
);

const paymentTransactionSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        subscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subscription',
            default: null
        },
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CompanyInvoice',
            default: null
        },
        provider: {
            type: String,
            enum: ['stripe', 'razorpay', 'manual'],
            default: 'manual'
        },
        providerPaymentId: { type: String, default: '' },
        providerOrderId: { type: String, default: '' },
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed', 'refunded'],
            default: 'pending',
            index: true
        },
        paymentMethod: { type: String, default: '' },
        verified: { type: Boolean, default: false },
        failureReason: { type: String, default: '' },
        paidAt: { type: Date, default: null },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    { timestamps: true, tenantScoped: false }
);

const billingEventSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            default: null,
            index: true
        },
        provider: {
            type: String,
            enum: ['stripe', 'razorpay', 'manual'],
            required: true
        },
        eventId: { type: String, required: true },
        eventType: { type: String, required: true },
        payload: { type: mongoose.Schema.Types.Mixed, default: {} },
        processed: { type: Boolean, default: false },
        processedAt: { type: Date, default: null },
        processingError: { type: String, default: '' }
    },
    { timestamps: true, tenantScoped: false }
);

billingEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

const usageCounterSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        periodKey: { type: String, required: true, index: true },
        users: { type: Number, default: 0 },
        employees: { type: Number, default: 0 },
        leads: { type: Number, default: 0 },
        customers: { type: Number, default: 0 },
        storageBytes: { type: Number, default: 0 },
        aiRequests: { type: Number, default: 0 },
        workflowRuns: { type: Number, default: 0 },
        whatsappMessages: { type: Number, default: 0 },
        emailSends: { type: Number, default: 0 },
        reportExports: { type: Number, default: 0 }
    },
    { timestamps: true, tenantScoped: false }
);

usageCounterSchema.index({ companyId: 1, periodKey: 1 }, { unique: true });

module.exports = {
    Company: mongoose.model('Company', companySchema),
    Plan: mongoose.model('Plan', planSchema),
    Subscription: mongoose.model('Subscription', subscriptionSchema),
    CompanyInvoice: mongoose.model('CompanyInvoice', companyInvoiceSchema),
    PaymentTransaction: mongoose.model(
        'PaymentTransaction',
        paymentTransactionSchema
    ),
    BillingEvent: mongoose.model('BillingEvent', billingEventSchema),
    UsageCounter: mongoose.model('UsageCounter', usageCounterSchema),
    featureFlagsSchema,
    usageLimitsSchema
};
