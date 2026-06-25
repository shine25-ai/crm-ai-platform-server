const mongoose = require('mongoose');

const templateCategories = [
    'Lead Follow-up',
    'Proposal',
    'Customer Welcome',
    'Payment Reminder',
    'Meeting Reminder',
    'General'
];

const relatedTypes = ['Lead', 'Customer'];

const emailTemplateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        category: {
            type: String,
            enum: templateCategories,
            default: 'General',
            index: true
        },
        subject: { type: String, required: true, trim: true },
        body: { type: String, required: true },
        placeholders: { type: [String], default: [] },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active',
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

const whatsappTemplateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        category: {
            type: String,
            enum: templateCategories,
            default: 'General',
            index: true
        },
        body: { type: String, required: true },
        placeholders: { type: [String], default: [] },
        approvalStatus: {
            type: String,
            enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected'],
            default: 'Draft',
            index: true
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

const emailLogSchema = new mongoose.Schema(
    {
        sentAt: { type: Date, default: Date.now, index: true },
        sender: { type: String, required: true, trim: true },
        recipient: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true },
        deliveryStatus: {
            type: String,
            enum: ['Queued', 'Sent', 'Delivered', 'Failed', 'Bounced'],
            default: 'Sent',
            index: true
        },
        openStatus: {
            type: String,
            enum: ['Unknown', 'Opened', 'Not Opened'],
            default: 'Unknown'
        },
        relatedType: { type: String, enum: relatedTypes, default: null },
        relatedLead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            default: null,
            index: true
        },
        relatedCustomer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null,
            index: true
        },
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmailTemplate',
            default: null
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

const whatsappLogSchema = new mongoose.Schema(
    {
        sentAt: { type: Date, default: Date.now, index: true },
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WhatsAppTemplate',
            default: null
        },
        templateName: { type: String, default: '', trim: true },
        recipient: { type: String, required: true, trim: true },
        deliveryStatus: {
            type: String,
            enum: ['Queued', 'Sent', 'Delivered', 'Failed'],
            default: 'Sent',
            index: true
        },
        readStatus: {
            type: String,
            enum: ['Unknown', 'Read', 'Unread'],
            default: 'Unknown'
        },
        relatedType: { type: String, enum: relatedTypes, default: null },
        relatedLead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lead',
            default: null,
            index: true
        },
        relatedCustomer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

module.exports = {
    EmailTemplate: mongoose.model('EmailTemplate', emailTemplateSchema),
    WhatsAppTemplate: mongoose.model(
        'WhatsAppTemplate',
        whatsappTemplateSchema
    ),
    EmailLog: mongoose.model('EmailLog', emailLogSchema),
    WhatsAppLog: mongoose.model('WhatsAppLog', whatsappLogSchema),
    templateCategories
};
