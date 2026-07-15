const {
    Company,
    Plan,
    Subscription,
    UsageCounter
} = require('../modules/saas/saas.model');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');
const saasService = require('../modules/saas/saas.service');
const bcrypt = require('bcryptjs');

const TENANT_ADMIN_EMAIL = 'tenant.admin@defaultcrm.com';
const TENANT_ADMIN_PASSWORD = 'Tenant@123';

const plans = [
    {
        name: 'Worthy',
        description: 'Entry CRM plan for small teams starting a SaaS trial.',
        price: 1200,
        currency: 'INR',
        billingInterval: 'monthly',
        trialDays: 14,
        sortOrder: 0,
        featureFlags: {
            crm: true,
            hr: true,
            reports: true,
            analytics: true,
            automations: false,
            emailTemplates: true,
            whatsapp: false,
            aiAssistant: false,
            projects: true,
            billing: true,
            attendance: true,
            gpsTracking: false,
            chat: true,
            documents: true,
            storage: true,
            expenses: true,
            assets: true
        },
        usageLimits: {
            maxUsers: 5,
            maxEmployees: 15,
            maxLeads: 500,
            maxCustomers: 100,
            maxStorageGB: 2,
            maxEmailSendsPerMonth: 500,
            maxWhatsappMessagesPerMonth: 0,
            maxAIRequestsPerMonth: 0,
            maxWorkflowRunsPerMonth: 50,
            maxReportExportsPerMonth: 25
        }
    },
    {
        name: 'Starter',
        description: 'Small team CRM plan with core sales and HR features.',
        price: 2999,
        currency: 'INR',
        billingInterval: 'monthly',
        trialDays: 14,
        sortOrder: 1,
        featureFlags: {
            crm: true,
            hr: true,
            reports: true,
            analytics: false,
            automations: false,
            emailTemplates: true,
            whatsapp: false,
            aiAssistant: false,
            projects: true,
            billing: true,
            attendance: true,
            chat: true,
            documents: true,
            storage: true,
            expenses: true,
            assets: true
        },
        usageLimits: {
            maxUsers: 10,
            maxEmployees: 25,
            maxLeads: 1000,
            maxCustomers: 250,
            maxStorageGB: 5,
            maxEmailSendsPerMonth: 1000,
            maxWhatsappMessagesPerMonth: 0,
            maxAIRequestsPerMonth: 0,
            maxWorkflowRunsPerMonth: 100,
            maxReportExportsPerMonth: 50
        }
    },
    {
        name: 'Growth',
        description: 'Automation, analytics, WhatsApp and larger team limits.',
        price: 7999,
        currency: 'INR',
        billingInterval: 'monthly',
        trialDays: 14,
        sortOrder: 2,
        featureFlags: {
            crm: true,
            hr: true,
            reports: true,
            analytics: true,
            automations: true,
            emailTemplates: true,
            whatsapp: true,
            aiAssistant: true,
            projects: true,
            billing: true,
            attendance: true,
            gpsTracking: true,
            chat: true,
            documents: true,
            storage: true,
            expenses: true,
            assets: true
        },
        usageLimits: {
            maxUsers: 50,
            maxEmployees: 150,
            maxLeads: 10000,
            maxCustomers: 2500,
            maxStorageGB: 50,
            maxEmailSendsPerMonth: 10000,
            maxWhatsappMessagesPerMonth: 3000,
            maxAIRequestsPerMonth: 2000,
            maxWorkflowRunsPerMonth: 5000,
            maxReportExportsPerMonth: 500
        }
    },
    {
        name: 'Enterprise',
        description:
            'Enterprise controls, high limits and platform integrations.',
        price: 24999,
        currency: 'INR',
        billingInterval: 'monthly',
        trialDays: 30,
        sortOrder: 3,
        featureFlags: {
            crm: true,
            hr: true,
            reports: true,
            analytics: true,
            automations: true,
            emailTemplates: true,
            whatsapp: true,
            aiAssistant: true,
            projects: true,
            billing: true,
            attendance: true,
            gpsTracking: true,
            chat: true,
            documents: true,
            storage: true,
            expenses: true,
            assets: true
        },
        usageLimits: {
            maxUsers: 500,
            maxEmployees: 1000,
            maxLeads: 100000,
            maxCustomers: 50000,
            maxStorageGB: 500,
            maxEmailSendsPerMonth: 100000,
            maxWhatsappMessagesPerMonth: 50000,
            maxAIRequestsPerMonth: 25000,
            maxWorkflowRunsPerMonth: 100000,
            maxReportExportsPerMonth: 10000
        }
    }
];

const seedPhase7 = async () => {
    for (const plan of plans) {
        await Plan.findOneAndUpdate({ name: plan.name }, plan, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });
    }

    let company = await Company.findOne({ domain: 'default.local' });
    if (!company) {
        company = await Company.create({
            companyName: 'Default CRM Tenant',
            legalName: 'Default CRM Tenant',
            domain: 'default.local',
            subdomain: 'default',
            status: 'active',
            timezone: 'Asia/Calcutta',
            locale: 'en-IN',
            currency: 'INR',
            billingContact: {
                name: process.env.DEFAULT_ADMIN_NAME || 'Admin',
                email: process.env.DEFAULT_ADMIN_EMAIL || ''
            }
        });
    }

    const superAdminRole = await Role.findOne({ roleCode: 'SUPER_ADMIN' });
    const adminRole = await Role.findOne({ roleCode: 'ADMIN' });
    await User.updateMany(
        {
            roleId: { $ne: superAdminRole?._id },
            $or: [
                { tenantId: { $exists: false } },
                { tenantId: null },
                { companyId: { $exists: false } },
                { companyId: null }
            ]
        },
        { $set: { tenantId: company._id, companyId: company._id } }
    );

    if (adminRole) {
        await User.findOneAndUpdate(
            { email: TENANT_ADMIN_EMAIL },
            {
                name: 'Default Tenant Admin',
                email: TENANT_ADMIN_EMAIL,
                password: await bcrypt.hash(TENANT_ADMIN_PASSWORD, 10),
                roleId: adminRole._id,
                tenantId: company._id,
                companyId: company._id,
                status: 'Active'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    const owner = await User.findOne({
        email: process.env.DEFAULT_ADMIN_EMAIL
    });
    if (owner && !company.ownerUser) {
        company.ownerUser = owner._id;
        await company.save();
    }

    const growthPlan = await Plan.findOne({ name: 'Growth' });
    const existingSubscription = await Subscription.findOne({
        companyId: company._id,
        status: { $in: ['trialing', 'active', 'past_due'] }
    });
    if (growthPlan && !existingSubscription) {
        await saasService.assignPlan({
            companyId: company._id,
            planId: growthPlan._id,
            provider: 'manual'
        });
    }

    await UsageCounter.findOneAndUpdate(
        {
            companyId: company._id,
            periodKey: saasService.currentPeriodKey()
        },
        {
            $setOnInsert: {
                users: await User.countDocuments({ companyId: company._id })
            }
        },
        { upsert: true }
    );

    console.log('✅ Phase 7 SaaS tenant, plans, subscription seeded');
    console.log(
        `Tenant admin login: ${TENANT_ADMIN_EMAIL} / ${TENANT_ADMIN_PASSWORD}`
    );
};

module.exports = seedPhase7;
