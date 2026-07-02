const Customer = require('../modules/customers/customer.model');
const Lead = require('../modules/leads/lead.model');
const User = require('../modules/users/user.model');
const {
    EmailTemplate,
    WhatsAppTemplate,
    InvoiceTemplate,
    EmailLog,
    WhatsAppLog
} = require('../modules/communications/communication.model');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

const seedCommunications = async () => {
    try {
        const [users, customers, leads] = await Promise.all([
            User.find({ status: { $in: ['Active', 'ACTIVE'] } }).lean(),
            Customer.find({}).lean(),
            Lead.find({ isDeleted: false }).lean()
        ]);

        const owner = users[0]?._id || null;
        const customer = customers[0] || null;
        const secondCustomer = customers[1] || customer;
        const lead = leads[0] || null;
        const secondLead = leads[1] || lead;

        await Promise.all([
            EmailTemplate.deleteMany({}),
            WhatsAppTemplate.deleteMany({}),
            EmailLog.deleteMany({}),
            WhatsAppLog.deleteMany({})
        ]);

        const emailTemplates = await EmailTemplate.insertMany([
            {
                name: 'Lead Follow-up After Demo',
                category: 'Lead Follow-up',
                subject: 'Next steps for {{companyName}}',
                body: 'Hi {{leadName}}, thank you for your time today. Based on the demo, we recommend the {{productInterest}} workflow as the next step.',
                placeholders: ['leadName', 'companyName', 'productInterest'],
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Proposal Shared',
                category: 'Proposal',
                subject: 'Proposal for {{companyName}}',
                body: 'Hello {{customerName}}, please find the proposal summary for {{proposalName}}. We can review pricing, rollout, and support terms in the next call.',
                placeholders: ['customerName', 'companyName', 'proposalName'],
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Customer Welcome',
                category: 'Customer Welcome',
                subject: 'Welcome to CRM AI Platform, {{customerName}}',
                body: 'Welcome {{customerName}}. Your account team will help configure onboarding, users, and first workflows for {{companyName}}.',
                placeholders: ['customerName', 'companyName'],
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Payment Reminder',
                category: 'Payment Reminder',
                subject: 'Payment reminder for {{invoiceNumber}}',
                body: 'Hi {{customerName}}, this is a reminder that invoice {{invoiceNumber}} is pending. Please let us know if you need the payment link resent.',
                placeholders: ['customerName', 'invoiceNumber'],
                status: 'Active',
                createdBy: owner
            }
        ]);

        const whatsappTemplates = await WhatsAppTemplate.insertMany([
            {
                name: 'Demo Follow-up',
                category: 'Lead Follow-up',
                body: 'Hi {{leadName}}, thanks for joining the demo. Can we schedule the next discussion for {{nextDate}}?',
                placeholders: ['leadName', 'nextDate'],
                approvalStatus: 'Approved',
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Proposal Reminder',
                category: 'Proposal',
                body: 'Hello {{customerName}}, the proposal for {{companyName}} has been shared. Please reply with a convenient review slot.',
                placeholders: ['customerName', 'companyName'],
                approvalStatus: 'Pending Approval',
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Welcome Message',
                category: 'Customer Welcome',
                body: 'Welcome {{customerName}}. Your CRM AI onboarding has started. Our team will share the kickoff details shortly.',
                placeholders: ['customerName'],
                approvalStatus: 'Approved',
                status: 'Active',
                createdBy: owner
            }
        ]);

        const invoiceTemplatePresets = [
            {
                name: 'Professional Indigo',
                title: 'CRM AI Platform',
                subtitle: 'Invoice {{invoiceNumber}} · {{projectName}}',
                primaryColor: '#4F46E5',
                footerText:
                    'Thank you {{customerName}}. Payment of {{totalAmount}} is due by {{dueDate}}.',
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Corporate Blue',
                title: '{{companyName}} Project Invoice',
                subtitle: '{{projectName}} · {{invoiceDate}}',
                primaryColor: '#2563EB',
                footerText:
                    'Invoice {{invoiceNumber}} was prepared for {{customerName}}.',
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Emerald Consulting',
                title: 'Consulting Services',
                subtitle: '{{projectName}} billing statement',
                primaryColor: '#059669',
                footerText:
                    'We appreciate your business. Total payable: {{totalAmount}}.',
                status: 'Active',
                createdBy: owner
            },
            {
                name: 'Minimal Slate',
                title: 'INVOICE',
                subtitle: '{{invoiceNumber}}',
                primaryColor: '#475569',
                footerText:
                    'Due {{dueDate}} · Please reference {{invoiceNumber}} with your payment.',
                status: 'Active',
                createdBy: owner
            }
        ];

        await InvoiceTemplate.bulkWrite(
            invoiceTemplatePresets.map((template) => ({
                updateOne: {
                    filter: { name: template.name },
                    update: { $setOnInsert: template },
                    upsert: true
                }
            }))
        );

        const defaultInvoiceTemplate = await InvoiceTemplate.findOne({
            isDefault: true
        });
        if (!defaultInvoiceTemplate) {
            await InvoiceTemplate.findOneAndUpdate(
                { name: 'Professional Indigo' },
                { $set: { isDefault: true } }
            );
        }

        const emailLogs = [];
        if (customer) {
            emailLogs.push({
                sentAt: daysAgo(4),
                sender: 'sales.manager@company.com',
                recipient: customer.email || 'customer@example.com',
                subject: 'Proposal and rollout plan shared',
                deliveryStatus: 'Delivered',
                openStatus: 'Opened',
                relatedType: 'Customer',
                relatedCustomer: customer._id,
                templateId: emailTemplates[1]._id,
                createdBy: owner
            });
        }
        if (secondCustomer) {
            emailLogs.push({
                sentAt: daysAgo(2),
                sender: 'accounts@crm-ai-platform.com',
                recipient: secondCustomer.email || 'finance@example.com',
                subject: 'Payment reminder for renewal invoice',
                deliveryStatus: 'Sent',
                openStatus: 'Unknown',
                relatedType: 'Customer',
                relatedCustomer: secondCustomer._id,
                templateId: emailTemplates[3]._id,
                createdBy: owner
            });
        }
        if (lead) {
            emailLogs.push({
                sentAt: hoursAgo(18),
                sender: 'sales.exec@company.com',
                recipient: lead.email || 'lead@example.com',
                subject: `Next steps for ${lead.companyName || lead.name}`,
                deliveryStatus: 'Delivered',
                openStatus: 'Opened',
                relatedType: 'Lead',
                relatedLead: lead._id,
                templateId: emailTemplates[0]._id,
                createdBy: owner
            });
        }

        const whatsappLogs = [];
        if (lead) {
            whatsappLogs.push({
                sentAt: daysAgo(1),
                templateId: whatsappTemplates[0]._id,
                templateName: whatsappTemplates[0].name,
                recipient: lead.mobile,
                deliveryStatus: 'Delivered',
                readStatus: 'Read',
                relatedType: 'Lead',
                relatedLead: lead._id,
                createdBy: owner
            });
        }
        if (secondLead) {
            whatsappLogs.push({
                sentAt: hoursAgo(8),
                templateId: whatsappTemplates[1]._id,
                templateName: whatsappTemplates[1].name,
                recipient: secondLead.mobile,
                deliveryStatus: 'Sent',
                readStatus: 'Unread',
                relatedType: 'Lead',
                relatedLead: secondLead._id,
                createdBy: owner
            });
        }
        if (customer) {
            whatsappLogs.push({
                sentAt: hoursAgo(3),
                templateId: whatsappTemplates[2]._id,
                templateName: whatsappTemplates[2].name,
                recipient: customer.mobileNumber || '+91 90000 00000',
                deliveryStatus: 'Delivered',
                readStatus: 'Read',
                relatedType: 'Customer',
                relatedCustomer: customer._id,
                createdBy: owner
            });
        }

        if (emailLogs.length > 0) await EmailLog.insertMany(emailLogs);
        if (whatsappLogs.length > 0) await WhatsAppLog.insertMany(whatsappLogs);

        console.log('Communication sample data seeded');
    } catch (error) {
        console.error('Error seeding communication sample data:', error);
    }
};

module.exports = seedCommunications;
