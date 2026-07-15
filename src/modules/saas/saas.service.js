const bcrypt = require('bcryptjs');
const {
    Company,
    Plan,
    Subscription,
    CompanyInvoice,
    PaymentTransaction,
    BillingEvent,
    UsageCounter
} = require('./saas.model');
const User = require('../users/user.model');
const Role = require('../roles/role.model');
const AppError = require('../../shared/utils/appError');
const stripeProvider = require('./providers/stripe.provider');
const razorpayProvider = require('./providers/razorpay.provider');

const providerMap = {
    stripe: stripeProvider,
    razorpay: razorpayProvider
};

const moduleCatalog = [
    {
        key: 'crm',
        name: 'CRM',
        description: 'Leads, customers, sales pipeline, and CRM tasks.'
    },
    {
        key: 'hr',
        name: 'HR',
        description: 'Employees, departments, roles, leave, and HR records.'
    },
    {
        key: 'attendance',
        name: 'Attendance',
        description:
            'Attendance dashboard, shift master, and work-hour tracking.'
    },
    {
        key: 'projects',
        name: 'Projects',
        description:
            'Projects, resources, issues, timesheets, and activity logs.'
    },
    {
        key: 'billing',
        name: 'Billing',
        description:
            'Customer billing, invoices, payment schedules, and tracking.'
    },
    {
        key: 'documents',
        name: 'Documents',
        description:
            'Document library and customer/project document management.'
    },
    {
        key: 'reports',
        name: 'Reports',
        description: 'Sales, leads, attendance, task, asset, and audit reports.'
    },
    {
        key: 'analytics',
        name: 'Analytics',
        description: 'Analytics dashboards and visual performance insights.'
    },
    {
        key: 'emailTemplates',
        name: 'Email Templates',
        description: 'Email templates and reusable communication content.'
    },
    {
        key: 'whatsapp',
        name: 'WhatsApp',
        description: 'WhatsApp delivery, templates, and provider settings.'
    },
    {
        key: 'aiAssistant',
        name: 'AI Assistant',
        description: 'AI assistant, insights, and AI-assisted workflows.'
    },
    {
        key: 'automations',
        name: 'Automations',
        description: 'Workflow automation, approvals, and campaign automation.'
    },
    {
        key: 'gpsTracking',
        name: 'GPS Tracking',
        description: 'Live location, geofencing, route history, and visits.'
    },
    {
        key: 'chat',
        name: 'Chat',
        description: 'Internal chat, floating messenger, and call logs.'
    },
    {
        key: 'assets',
        name: 'Assets',
        description: 'Asset inventory, assignments, and asset reports.'
    },
    {
        key: 'expenses',
        name: 'Expenses',
        description:
            'Employee expense claims, receipts, and HR review workflow.'
    },
    {
        key: 'storage',
        name: 'Storage',
        description: 'Tenant storage allocation and upload usage.'
    }
];

const currentPeriodKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getProvider = (provider) => {
    const instance = providerMap[provider];
    if (!instance) throw new AppError('Unsupported billing provider', 400);
    return instance;
};

const buildInvoiceNumber = () =>
    `SAAS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now()}`;

const listCompanies = async (filters = {}) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
        query.$or = [
            { companyName: new RegExp(filters.search, 'i') },
            { domain: new RegExp(filters.search, 'i') },
            { 'billingContact.email': new RegExp(filters.search, 'i') }
        ];
    }
    const companies = await Company.find(query)
        .populate('ownerUser', 'name email')
        .sort({
            createdAt: -1
        });
    const companyIds = companies.map((company) => company._id);
    const subscriptions = await Subscription.find({
        companyId: { $in: companyIds },
        status: { $in: ['trialing', 'active', 'past_due'] }
    })
        .sort({ createdAt: -1 })
        .populate('planId');
    const subscriptionMap = new Map();
    subscriptions.forEach((subscription) => {
        const key = String(subscription.companyId);
        if (!subscriptionMap.has(key)) {
            subscriptionMap.set(key, subscription);
        }
    });

    return companies.map((company) => {
        const currentSubscription = subscriptionMap.get(String(company._id));
        return {
            ...company.toObject(),
            currentSubscription: currentSubscription?.toObject() || null,
            currentPlan: currentSubscription?.planId || null
        };
    });
};

const createCompany = async (payload = {}, userId) => {
    const company = await Company.create({
        companyName: payload.companyName,
        legalName: payload.legalName || payload.companyName,
        domain: payload.domain,
        subdomain: payload.subdomain,
        timezone: payload.timezone || 'Asia/Calcutta',
        locale: payload.locale || 'en-IN',
        currency: payload.currency || 'INR',
        billingContact: payload.billingContact || {},
        address: payload.address || {},
        taxId: payload.taxId || '',
        featureSettings: payload.featureSettings || {},
        createdBy: userId,
        updatedBy: userId,
        status: payload.status || 'trial'
    });

    if (payload.owner) {
        const adminRole = await Role.findOne({ roleCode: 'ADMIN' });
        if (!adminRole) throw new AppError('Admin role is not configured', 500);
        const password = payload.owner.password || 'Admin@123';
        const owner = await User.create({
            name: payload.owner.name,
            email: payload.owner.email,
            password: await bcrypt.hash(password, 10),
            roleId: adminRole._id,
            companyId: company._id,
            tenantId: company._id,
            status: 'Active'
        });
        company.ownerUser = owner._id;
        await company.save();
    }

    return company.populate('ownerUser', 'name email');
};

const updateCompanyStatus = async (id, status, userId) => {
    const company = await Company.findById(id);
    if (!company) throw new AppError('Company not found', 404);
    company.status = status;
    company.updatedBy = userId;
    await company.save();
    return company;
};

const updateCompany = async (id, payload = {}, userId) => {
    const company = await Company.findById(id).populate(
        'ownerUser',
        'name email'
    );
    if (!company) throw new AppError('Company not found', 404);

    const allowedFields = [
        'companyName',
        'legalName',
        'status',
        'domain',
        'subdomain',
        'timezone',
        'locale',
        'currency',
        'taxId',
        'billingContact',
        'address'
    ];

    allowedFields.forEach((field) => {
        if (payload[field] !== undefined) {
            company[field] = payload[field];
        }
    });

    company.updatedBy = userId;

    if (payload.owner && company.ownerUser) {
        const owner = await User.findById(company.ownerUser._id);
        if (owner) {
            if (payload.owner.name !== undefined)
                owner.name = payload.owner.name;
            if (payload.owner.email !== undefined) {
                owner.email = String(payload.owner.email).toLowerCase();
            }
            await owner.save();
        }
    }

    await company.save();
    return company.populate('ownerUser', 'name email');
};

const listPlans = (includeArchived = false) => {
    const query = includeArchived ? {} : { status: 'active' };
    return Plan.find(query).sort({ sortOrder: 1, price: 1 });
};

const listPublicPlans = () =>
    Plan.find({ status: 'active' })
        .select(
            'name description price currency billingInterval trialDays featureFlags usageLimits sortOrder'
        )
        .sort({ sortOrder: 1, price: 1 });

const upsertPlan = async (payload = {}) => {
    const data = {
        name: payload.name,
        description: payload.description || '',
        price: Number(payload.price || 0),
        currency: payload.currency || 'INR',
        billingInterval: payload.billingInterval || 'monthly',
        trialDays: Number(payload.trialDays ?? 14),
        status: payload.status || 'active',
        featureFlags: payload.featureFlags || {},
        usageLimits: payload.usageLimits || {},
        providerPriceIds: payload.providerPriceIds || {},
        sortOrder: Number(payload.sortOrder || 0)
    };

    if (payload._id) {
        const plan = await Plan.findByIdAndUpdate(payload._id, data, {
            new: true
        });
        if (!plan) throw new AppError('Plan not found', 404);
        return plan;
    }
    return Plan.create(data);
};

const archivePlan = async (id) => {
    const plan = await Plan.findByIdAndUpdate(
        id,
        { status: 'archived' },
        { new: true }
    );
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
};

const mergePlanFeatureSettings = (currentSettings = {}, planFlags = {}) => {
    const nextSettings = { ...currentSettings };

    moduleCatalog.forEach(({ key }) => {
        if (!planFlags[key]) {
            nextSettings[key] = false;
            return;
        }

        if (nextSettings[key] === undefined) {
            nextSettings[key] = true;
        }
    });

    return nextSettings;
};

const assignPlan = async ({ companyId, planId, provider = 'manual' }) => {
    const [company, plan] = await Promise.all([
        Company.findById(companyId),
        Plan.findById(planId)
    ]);
    if (!company) throw new AppError('Company not found', 404);
    if (!plan) throw new AppError('Plan not found', 404);

    await Subscription.updateMany(
        { companyId, status: { $in: ['trialing', 'active', 'past_due'] } },
        { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );

    const now = new Date();
    const trialEnd = new Date(
        now.getTime() + Number(plan.trialDays || 0) * 24 * 60 * 60 * 1000
    );
    const periodEnd = new Date(now);
    periodEnd.setMonth(
        periodEnd.getMonth() + (plan.billingInterval === 'yearly' ? 12 : 1)
    );

    company.status = plan.trialDays > 0 ? 'trial' : 'active';
    company.featureSettings = mergePlanFeatureSettings(
        company.featureSettings || {},
        plan.featureFlags || {}
    );
    await company.save();

    return Subscription.create({
        companyId,
        planId,
        provider,
        status: plan.trialDays > 0 ? 'trialing' : 'active',
        billingInterval: plan.billingInterval,
        amount: plan.price,
        currency: plan.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStart: now,
        trialEnd
    });
};

const activateDemoCheckout = async ({ companyId, planId, userId = null }) => {
    const subscription = await assignPlan({
        companyId,
        planId,
        provider: 'manual'
    });
    const [company, plan] = await Promise.all([
        Company.findById(companyId),
        Plan.findById(planId)
    ]);
    if (!company) throw new AppError('Company not found', 404);
    if (!plan) throw new AppError('Plan not found', 404);

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);

    company.status = 'active';
    company.featureSettings = mergePlanFeatureSettings(
        company.featureSettings || {},
        plan.featureFlags || {}
    );
    company.updatedBy = userId;
    await company.save();

    subscription.status = 'active';
    subscription.trialEnd = null;
    subscription.metadata = {
        ...(subscription.metadata || {}),
        demoActivated: true,
        activatedBy: userId,
        activatedAt: now
    };
    await subscription.save();

    const invoice = await CompanyInvoice.create({
        companyId,
        subscriptionId: subscription._id,
        provider: 'manual',
        providerInvoiceId: `demo_invoice_${subscription._id}`,
        invoiceNumber: buildInvoiceNumber(),
        amount: plan.price,
        currency: plan.currency,
        status: 'paid',
        dueDate,
        paidAt: now,
        lineItems: [
            {
                description: `${plan.name} ${plan.billingInterval} subscription`,
                quantity: 1,
                amount: plan.price,
                currency: plan.currency
            }
        ]
    });

    const payment = await PaymentTransaction.create({
        companyId,
        subscriptionId: subscription._id,
        invoiceId: invoice._id,
        provider: 'manual',
        providerPaymentId: `demo_payment_${subscription._id}`,
        amount: plan.price,
        currency: plan.currency,
        status: 'success',
        paymentMethod: 'Demo manual activation',
        verified: true,
        paidAt: now,
        metadata: {
            demoMode: true,
            activatedBy: userId
        }
    });

    await BillingEvent.create({
        companyId,
        provider: 'manual',
        eventId: `demo_checkout_${subscription._id}`,
        eventType: 'demo.checkout.activated',
        payload: {
            companyId,
            planId,
            subscriptionId: subscription._id,
            invoiceId: invoice._id,
            paymentId: payment._id
        },
        processed: true,
        processedAt: now
    });

    await UsageCounter.findOneAndUpdate(
        { companyId, periodKey: currentPeriodKey() },
        { $setOnInsert: { companyId, periodKey: currentPeriodKey() } },
        { upsert: true, new: true }
    );

    return {
        demoMode: true,
        activated: true,
        checkoutUrl: '',
        message: 'Demo checkout skipped. Plan activated successfully.',
        company,
        plan,
        subscription,
        invoice,
        payment
    };
};

const cancelTenantSubscription = async (companyId) => {
    const subscription = await Subscription.findOne({
        companyId,
        status: { $in: ['trialing', 'active', 'past_due'] }
    }).sort({ createdAt: -1 });
    if (!subscription) throw new AppError('Active subscription not found', 404);

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancelAtPeriodEnd = false;
    await subscription.save();

    await Company.findByIdAndUpdate(companyId, { status: 'cancelled' });
    return subscription;
};

const updateBillingContact = async (companyId, billingContact = {}) => {
    const company = await Company.findByIdAndUpdate(
        companyId,
        { billingContact },
        { new: true }
    );
    if (!company) throw new AppError('Company not found', 404);
    return company;
};

const getActiveSubscription = (companyId) =>
    Subscription.findOne({
        companyId,
        status: { $in: ['trialing', 'active', 'past_due'] }
    })
        .sort({ createdAt: -1 })
        .populate('planId');

const buildTenantModules = ({ company, subscription }) => {
    const plan = subscription?.planId || null;
    const planFlags = plan?.featureFlags || {};
    const tenantSettings = company?.featureSettings || {};

    return moduleCatalog.map((module) => {
        const includedInPlan = Boolean(planFlags[module.key]);
        const savedTenantValue = tenantSettings[module.key];
        const tenantEnabled =
            includedInPlan && savedTenantValue !== undefined
                ? Boolean(savedTenantValue)
                : includedInPlan;

        return {
            ...module,
            includedInPlan,
            tenantEnabled,
            locked: !includedInPlan,
            status: !includedInPlan
                ? 'locked'
                : tenantEnabled
                  ? 'active'
                  : 'disabled'
        };
    });
};

const getTenantModules = async (companyId) => {
    const [company, subscription] = await Promise.all([
        Company.findById(companyId),
        getActiveSubscription(companyId)
    ]);

    if (!company) throw new AppError('Company not found', 404);

    return {
        company: {
            _id: company._id,
            companyName: company.companyName,
            featureSettings: company.featureSettings || {}
        },
        plan: subscription?.planId || null,
        subscription,
        modules: buildTenantModules({ company, subscription })
    };
};

const updateTenantModules = async (companyId, modules = {}) => {
    const [company, subscription] = await Promise.all([
        Company.findById(companyId),
        getActiveSubscription(companyId)
    ]);

    if (!company) throw new AppError('Company not found', 404);
    if (!subscription?.planId) {
        throw new AppError('No active subscription plan is assigned.', 402);
    }

    const planFlags = subscription.planId.featureFlags || {};
    const nextSettings = { ...(company.featureSettings || {}) };

    moduleCatalog.forEach((module) => {
        if (modules[module.key] === undefined) return;

        if (!planFlags[module.key]) {
            nextSettings[module.key] = false;
            return;
        }

        nextSettings[module.key] = Boolean(modules[module.key]);
    });

    company.featureSettings = nextSettings;
    await company.save();

    return getTenantModules(companyId);
};

const getTenantBilling = async (companyId) => {
    const [company, subscription, usage, invoices, payments] =
        await Promise.all([
            Company.findById(companyId),
            Subscription.findOne({ companyId })
                .sort({ createdAt: -1 })
                .populate('planId'),
            UsageCounter.findOne({
                companyId,
                periodKey: currentPeriodKey()
            }),
            CompanyInvoice.find({ companyId })
                .sort({ createdAt: -1 })
                .limit(20),
            PaymentTransaction.find({ companyId })
                .sort({ createdAt: -1 })
                .limit(20)
        ]);

    return { company, subscription, usage, invoices, payments };
};

const getPlatformDashboard = async () => {
    const [companies, activeSubscriptions, failedPayments, invoices] =
        await Promise.all([
            Company.find(),
            Subscription.find({
                status: { $in: ['trialing', 'active', 'past_due'] }
            }).populate('planId'),
            PaymentTransaction.countDocuments({ status: 'failed' }),
            CompanyInvoice.find({ status: 'paid' })
        ]);

    const mrr = activeSubscriptions.reduce((total, sub) => {
        const amount = Number(sub.amount || 0);
        return (
            total + (sub.billingInterval === 'yearly' ? amount / 12 : amount)
        );
    }, 0);

    const planDistribution = activeSubscriptions.reduce((acc, sub) => {
        const planName = sub.planId?.name || 'Unknown';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
    }, {});

    const revenueByProvider = invoices.reduce((acc, invoice) => {
        acc[invoice.provider] = (acc[invoice.provider] || 0) + invoice.amount;
        return acc;
    }, {});

    return {
        mrr,
        activeCompanies: companies.filter((company) =>
            ['active', 'trial'].includes(company.status)
        ).length,
        failedPayments,
        churn: companies.filter((company) =>
            ['cancelled', 'archived'].includes(company.status)
        ).length,
        planDistribution,
        revenueByProvider,
        companiesByStatus: companies.reduce((acc, company) => {
            acc[company.status] = (acc[company.status] || 0) + 1;
            return acc;
        }, {})
    };
};

const incrementUsage = async (companyId, key, amount = 1) => {
    const allowedKeys = [
        'users',
        'employees',
        'leads',
        'customers',
        'storageBytes',
        'aiRequests',
        'workflowRuns',
        'whatsappMessages',
        'emailSends',
        'reportExports'
    ];
    if (!allowedKeys.includes(key)) {
        throw new AppError('Unsupported usage counter', 400);
    }
    return UsageCounter.findOneAndUpdate(
        { companyId, periodKey: currentPeriodKey() },
        { $inc: { [key]: amount } },
        { upsert: true, new: true }
    );
};

const createCheckout = async ({
    companyId,
    planId,
    provider,
    userId = null
}) => {
    const [company, plan] = await Promise.all([
        Company.findById(companyId),
        Plan.findById(planId)
    ]);
    if (!company) throw new AppError('Company not found', 404);
    if (!plan) throw new AppError('Plan not found', 404);
    if (
        ['demo', 'manual', 'skip'].includes(
            String(provider || '').toLowerCase()
        )
    ) {
        return activateDemoCheckout({ companyId, planId, userId });
    }
    if (provider === 'razorpay') {
        const invoice = await CompanyInvoice.create({
            companyId,
            provider: 'razorpay',
            invoiceNumber: buildInvoiceNumber(),
            amount: plan.price,
            currency: plan.currency,
            status: 'open',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            lineItems: [
                {
                    description: `${plan.name} ${plan.billingInterval} subscription`,
                    quantity: 1,
                    amount: plan.price,
                    currency: plan.currency
                }
            ]
        });
        const checkout = await getProvider(provider).createCheckout({
            company,
            plan,
            receipt: invoice.invoiceNumber,
            notes: {
                invoiceId: String(invoice._id),
                userId: String(userId || '')
            }
        });
        const payment = await PaymentTransaction.create({
            companyId,
            invoiceId: invoice._id,
            provider: 'razorpay',
            providerOrderId: checkout.orderId,
            amount: plan.price,
            currency: plan.currency,
            status: 'pending',
            paymentMethod: 'Razorpay Checkout',
            metadata: {
                planId,
                userId,
                receipt: checkout.receipt
            }
        });
        return {
            ...checkout,
            paymentTransactionId: payment._id,
            invoiceId: invoice._id,
            planName: plan.name,
            companyName: company.companyName,
            prefill: {
                name: company.billingContact?.name || company.companyName,
                email: company.billingContact?.email || '',
                contact: company.billingContact?.phone || ''
            }
        };
    }
    return getProvider(provider).createCheckout({ company, plan });
};

const activateRazorpayPayment = async ({
    orderId,
    paymentId,
    signature,
    source = 'checkout'
}) => {
    getProvider('razorpay').verifyPaymentSignature({
        orderId,
        paymentId,
        signature
    });

    const payment = await PaymentTransaction.findOne({
        provider: 'razorpay',
        providerOrderId: orderId
    });
    if (!payment) throw new AppError('Razorpay payment order not found', 404);

    if (payment.status === 'success') {
        return { alreadyProcessed: true, payment };
    }

    const planId = payment.metadata?.planId;
    if (!planId) throw new AppError('Payment plan mapping is missing', 500);

    const subscription = await assignPlan({
        companyId: payment.companyId,
        planId,
        provider: 'razorpay'
    });
    subscription.metadata = {
        ...(subscription.metadata || {}),
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        paymentSource: source
    };
    await subscription.save();

    payment.subscriptionId = subscription._id;
    payment.providerPaymentId = paymentId;
    payment.status = 'success';
    payment.verified = true;
    payment.paidAt = new Date();
    payment.metadata = {
        ...(payment.metadata || {}),
        paymentSource: source,
        signatureVerifiedAt: new Date()
    };
    await payment.save();

    if (payment.invoiceId) {
        await CompanyInvoice.findByIdAndUpdate(payment.invoiceId, {
            subscriptionId: subscription._id,
            providerInvoiceId: orderId,
            status: 'paid',
            paidAt: new Date()
        });
    }

    return { payment, subscription };
};

const markRazorpayPaymentFailed = async ({ orderId, paymentId, reason }) => {
    const payment = await PaymentTransaction.findOne({
        provider: 'razorpay',
        providerOrderId: orderId
    });
    if (!payment) return null;
    payment.providerPaymentId = paymentId || payment.providerPaymentId;
    payment.status = 'failed';
    payment.failureReason = reason || 'Razorpay payment failed';
    await payment.save();
    if (payment.invoiceId) {
        await CompanyInvoice.findByIdAndUpdate(payment.invoiceId, {
            status: 'failed'
        });
    }
    return payment;
};

const signupCompany = async (payload = {}) => {
    if (!payload.planId) throw new AppError('Plan is required', 400);
    if (!payload.companyName)
        throw new AppError('Company name is required', 400);
    if (
        !payload.owner?.name ||
        !payload.owner?.email ||
        !payload.owner?.password
    ) {
        throw new AppError('Owner name, email, and password are required', 400);
    }

    const plan = await Plan.findById(payload.planId);
    if (!plan || plan.status !== 'active') {
        throw new AppError('Selected plan is not available', 404);
    }

    const company = await createCompany(
        {
            ...payload,
            status: 'trial',
            currency: payload.currency || plan.currency || 'INR',
            featureSettings: plan.featureFlags || {}
        },
        null
    );

    const subscription = await activateDemoCheckout({
        companyId: company._id,
        planId: plan._id,
        userId: company.ownerUser?._id || null
    });

    return {
        company,
        plan,
        subscription: subscription.subscription,
        ownerEmail: payload.owner.email
    };
};

const verifyWebhookSignature = ({ provider, rawBody, headers = {} }) => {
    if (provider === 'stripe' && process.env.STRIPE_WEBHOOK_SECRET) {
        getProvider(provider).verifyWebhookSignature(
            rawBody || '',
            headers['stripe-signature']
        );
    }

    if (provider === 'razorpay' && process.env.RAZORPAY_WEBHOOK_SECRET) {
        getProvider(provider).verifyWebhookSignature(
            rawBody || '',
            headers['x-razorpay-signature']
        );
    }
};

const processWebhook = async ({ provider, eventId, eventType, payload }) => {
    try {
        const event = await BillingEvent.create({
            provider,
            eventId,
            eventType,
            payload,
            processed: true,
            processedAt: new Date()
        });
        return { duplicate: false, event };
    } catch (error) {
        if (error.code === 11000) {
            return { duplicate: true };
        }
        throw error;
    }
};

const handleRazorpayWebhook = async (payload = {}) => {
    const eventType = payload.event || payload.type || '';
    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity?.order_id) return { handled: false };

    if (['payment.captured', 'payment.authorized'].includes(eventType)) {
        const payment = await PaymentTransaction.findOne({
            provider: 'razorpay',
            providerOrderId: paymentEntity.order_id
        });
        if (!payment || payment.status === 'success') {
            return { handled: Boolean(payment), alreadyProcessed: true };
        }

        const planId = payment.metadata?.planId;
        const subscription = await assignPlan({
            companyId: payment.companyId,
            planId,
            provider: 'razorpay'
        });
        subscription.metadata = {
            ...(subscription.metadata || {}),
            razorpayOrderId: paymentEntity.order_id,
            razorpayPaymentId: paymentEntity.id,
            paymentSource: 'webhook'
        };
        await subscription.save();

        payment.subscriptionId = subscription._id;
        payment.providerPaymentId = paymentEntity.id;
        payment.status = 'success';
        payment.verified = true;
        payment.paidAt = new Date(
            Number(paymentEntity.created_at || 0) * 1000 || Date.now()
        );
        payment.metadata = {
            ...(payment.metadata || {}),
            webhookEvent: eventType
        };
        await payment.save();

        if (payment.invoiceId) {
            await CompanyInvoice.findByIdAndUpdate(payment.invoiceId, {
                subscriptionId: subscription._id,
                providerInvoiceId: paymentEntity.order_id,
                status: 'paid',
                paidAt: payment.paidAt
            });
        }

        return { handled: true, payment, subscription };
    }

    if (eventType === 'payment.failed') {
        await markRazorpayPaymentFailed({
            orderId: paymentEntity.order_id,
            paymentId: paymentEntity.id,
            reason:
                paymentEntity.error_description ||
                paymentEntity.error_reason ||
                'Razorpay payment failed'
        });
        return { handled: true };
    }

    return { handled: false };
};

module.exports = {
    listCompanies,
    createCompany,
    updateCompany,
    updateCompanyStatus,
    listPlans,
    listPublicPlans,
    signupCompany,
    upsertPlan,
    archivePlan,
    assignPlan,
    cancelTenantSubscription,
    updateBillingContact,
    getTenantModules,
    updateTenantModules,
    getTenantBilling,
    getPlatformDashboard,
    incrementUsage,
    activateDemoCheckout,
    createCheckout,
    activateRazorpayPayment,
    handleRazorpayWebhook,
    verifyWebhookSignature,
    processWebhook,
    currentPeriodKey,
    moduleCatalog
};
