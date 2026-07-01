const {
    EmailTemplate,
    WhatsAppTemplate,
    EmailLog,
    WhatsAppLog,
    CommunicationSetting,
    templateCategories
} = require('./communication.model');
const AppError = require('../../shared/utils/appError');
const Lead = require('../leads/lead.model');
const Customer = require('../customers/customer.model');
const User = require('../users/user.model');
const nodemailer = require('nodemailer');
const axios = require('axios');
const {
    encryptSecret,
    decryptSecret
} = require('../../shared/utils/secretEncryption');

const extractPlaceholders = (value = '') => {
    const matches = String(value).match(/{{\s*[\w.]+\s*}}/g) || [];
    return [
        ...new Set(matches.map((item) => item.replace(/[{}]/g, '').trim()))
    ];
};

const normalizePlaceholderKey = (value = '') =>
    String(value)
        .trim()
        .toLowerCase()
        .replace(/[._\s-]/g, '');

const resolvePlaceholders = (value = '', context = {}) => {
    const normalizedContext = Object.entries(context).reduce(
        (result, [key, item]) => ({
            ...result,
            [normalizePlaceholderKey(key)]: item ?? ''
        }),
        {}
    );
    return String(value).replace(
        /{{\s*([^}]+)\s*}}/g,
        (_, key) =>
            normalizedContext[normalizePlaceholderKey(key)] ??
            `{{${String(key).trim()}}}`
    );
};

const getSettingsWithSecrets = () =>
    CommunicationSetting.findOne({ key: 'default' }).select(
        '+smtp.passwordEncrypted +whatsapp.accessTokenEncrypted'
    );

const publicSettings = (settings) => ({
    smtp: {
        enabled: Boolean(settings?.smtp?.enabled),
        host: settings?.smtp?.host || '',
        port: settings?.smtp?.port || 587,
        secure: Boolean(settings?.smtp?.secure),
        username: settings?.smtp?.username || '',
        fromName: settings?.smtp?.fromName || 'CRM AI Platform',
        fromEmail: settings?.smtp?.fromEmail || '',
        passwordConfigured: Boolean(settings?.smtp?.passwordEncrypted)
    },
    whatsapp: {
        enabled: Boolean(settings?.whatsapp?.enabled),
        apiBaseUrl:
            settings?.whatsapp?.apiBaseUrl ||
            'https://graph.facebook.com/v22.0',
        phoneNumberId: settings?.whatsapp?.phoneNumberId || '',
        accessTokenConfigured: Boolean(settings?.whatsapp?.accessTokenEncrypted)
    },
    updatedAt: settings?.updatedAt || null
});

const getCommunicationSettings = async () =>
    publicSettings(await getSettingsWithSecrets());

const updateCommunicationSettings = async (payload = {}, userId) => {
    let settings = await getSettingsWithSecrets();
    if (!settings) settings = new CommunicationSetting({ key: 'default' });

    if (payload.smtp) {
        const port = Number(payload.smtp.port ?? settings.smtp.port ?? 587);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new AppError('SMTP port must be between 1 and 65535', 400);
        }
        settings.smtp.enabled = Boolean(payload.smtp.enabled);
        settings.smtp.host = String(payload.smtp.host || '').trim();
        settings.smtp.port = port;
        settings.smtp.secure = Boolean(payload.smtp.secure);
        settings.smtp.username = String(payload.smtp.username || '').trim();
        settings.smtp.fromName = String(
            payload.smtp.fromName || 'CRM AI Platform'
        ).trim();
        settings.smtp.fromEmail = String(payload.smtp.fromEmail || '').trim();
        if (payload.smtp.password) {
            settings.smtp.passwordEncrypted = encryptSecret(
                payload.smtp.password
            );
        }
    }

    if (payload.whatsapp) {
        settings.whatsapp.enabled = Boolean(payload.whatsapp.enabled);
        settings.whatsapp.apiBaseUrl = String(
            payload.whatsapp.apiBaseUrl || 'https://graph.facebook.com/v22.0'
        )
            .trim()
            .replace(/\/+$/, '');
        settings.whatsapp.phoneNumberId = String(
            payload.whatsapp.phoneNumberId || ''
        ).trim();
        if (payload.whatsapp.accessToken) {
            settings.whatsapp.accessTokenEncrypted = encryptSecret(
                payload.whatsapp.accessToken
            );
        }
    }

    settings.updatedBy = userId;
    await settings.save();
    return publicSettings(settings);
};

const assertSmtpSettings = (settings) => {
    const missing = [];
    if (!settings?.smtp?.enabled) missing.push('enabled');
    if (!settings?.smtp?.host) missing.push('host');
    if (!settings?.smtp?.port) missing.push('port');
    if (!settings?.smtp?.username) missing.push('username');
    if (!settings?.smtp?.passwordEncrypted) missing.push('password');
    if (!settings?.smtp?.fromEmail) missing.push('from email');
    if (missing.length) {
        throw new AppError(
            `SMTP configuration is incomplete: ${missing.join(', ')}`,
            400
        );
    }
};

const createSmtpTransporter = (settings) => {
    assertSmtpSettings(settings);
    return nodemailer.createTransport({
        host: settings.smtp.host,
        port: settings.smtp.port,
        secure: settings.smtp.secure,
        auth: {
            user: settings.smtp.username,
            pass: decryptSecret(settings.smtp.passwordEncrypted)
        }
    });
};

const testCommunicationSettings = async (channel) => {
    const settings = await getSettingsWithSecrets();
    if (!settings) throw new AppError('Communication settings not found', 404);
    if (channel === 'email') {
        await createSmtpTransporter(settings).verify();
        return { channel, connected: true };
    }
    if (channel === 'whatsapp') {
        if (
            !settings.whatsapp?.enabled ||
            !settings.whatsapp?.phoneNumberId ||
            !settings.whatsapp?.accessTokenEncrypted
        ) {
            throw new AppError('WhatsApp configuration is incomplete', 400);
        }
        await axios.get(
            `${settings.whatsapp.apiBaseUrl}/${settings.whatsapp.phoneNumberId}`,
            {
                headers: {
                    Authorization: `Bearer ${decryptSecret(
                        settings.whatsapp.accessTokenEncrypted
                    )}`
                }
            }
        );
        return { channel, connected: true };
    }
    throw new AppError('Unsupported communication channel', 400);
};

const buildTemplateContext = async (payload, userId) => {
    const [user, relatedRecord] = await Promise.all([
        User.findById(userId).lean(),
        payload.relatedType === 'Lead' && payload.relatedId
            ? Lead.findById(payload.relatedId).lean()
            : payload.relatedType === 'Customer' && payload.relatedId
              ? Customer.findById(payload.relatedId).lean()
              : null
    ]);
    return {
        ...(payload.context || {}),
        name: relatedRecord?.name || relatedRecord?.customerName || '',
        leadName: relatedRecord?.name || '',
        customerName: relatedRecord?.customerName || '',
        company: relatedRecord?.companyName || '',
        companyName: relatedRecord?.companyName || '',
        email: relatedRecord?.email || '',
        mobile: relatedRecord?.mobile || relatedRecord?.mobileNumber || '',
        followUpDate:
            payload.context?.followUpDate ||
            relatedRecord?.nextFollowUpDate ||
            '',
        employeeName: user?.name || '',
        employeeEmail: user?.email || ''
    };
};

const buildRelatedFields = (payload = {}) => {
    const relatedType = payload.relatedType || null;
    return {
        relatedType,
        relatedLead: relatedType === 'Lead' ? payload.relatedId || null : null,
        relatedCustomer:
            relatedType === 'Customer' ? payload.relatedId || null : null
    };
};

const buildQuery = (filters = {}) => {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;
    if (filters.search) {
        const regex = new RegExp(filters.search, 'i');
        query.$or = [{ name: regex }, { subject: regex }, { body: regex }];
    }
    return query;
};

const populateTemplate = (query) => query.populate('createdBy', 'name email');

const populateEmailLog = (query) =>
    query
        .populate('createdBy', 'name email')
        .populate('templateId', 'name category')
        .populate('relatedLead', 'name companyName email mobile')
        .populate(
            'relatedCustomer',
            'customerName companyName email mobileNumber'
        );

const populateWhatsappLog = (query) =>
    query
        .populate('createdBy', 'name email')
        .populate('templateId', 'name category')
        .populate('relatedLead', 'name companyName email mobile')
        .populate(
            'relatedCustomer',
            'customerName companyName email mobileNumber'
        );

const normalizeEmailTemplate = (payload = {}, userId) => {
    if (!payload.name?.trim())
        throw new AppError('Template name is required', 400);
    if (!payload.subject?.trim())
        throw new AppError('Email subject is required', 400);
    if (!payload.body?.trim())
        throw new AppError('Template body is required', 400);

    const placeholders =
        payload.placeholders?.length > 0
            ? payload.placeholders
            : extractPlaceholders(`${payload.subject} ${payload.body}`);

    return {
        name: payload.name,
        category: payload.category || 'General',
        subject: payload.subject,
        body: payload.body,
        placeholders,
        status: payload.status || 'Active',
        createdBy: userId
    };
};

const normalizeWhatsappTemplate = (payload = {}, userId) => {
    if (!payload.name?.trim())
        throw new AppError('Template name is required', 400);
    if (!payload.body?.trim())
        throw new AppError('Template body is required', 400);

    const placeholders =
        payload.placeholders?.length > 0
            ? payload.placeholders
            : extractPlaceholders(payload.body);

    return {
        name: payload.name,
        category: payload.category || 'General',
        body: payload.body,
        placeholders,
        approvalStatus: payload.approvalStatus || 'Draft',
        status: payload.status || 'Active',
        createdBy: userId
    };
};

const listEmailTemplates = (filters = {}) =>
    populateTemplate(
        EmailTemplate.find(buildQuery(filters)).sort({ createdAt: -1 })
    );

const createEmailTemplate = async (payload, userId) =>
    EmailTemplate.create(normalizeEmailTemplate(payload, userId));

const updateEmailTemplate = async (id, payload, userId) => {
    const template = await EmailTemplate.findByIdAndUpdate(
        id,
        normalizeEmailTemplate(payload, userId),
        { new: true, runValidators: true }
    );
    if (!template) throw new AppError('Email template not found', 404);
    return template;
};

const deleteEmailTemplate = async (id) => {
    const template = await EmailTemplate.findByIdAndDelete(id);
    if (!template) throw new AppError('Email template not found', 404);
    return { success: true };
};

const listWhatsappTemplates = (filters = {}) =>
    populateTemplate(
        WhatsAppTemplate.find(buildQuery(filters)).sort({ createdAt: -1 })
    );

const createWhatsappTemplate = async (payload, userId) =>
    WhatsAppTemplate.create(normalizeWhatsappTemplate(payload, userId));

const updateWhatsappTemplate = async (id, payload, userId) => {
    const template = await WhatsAppTemplate.findByIdAndUpdate(
        id,
        normalizeWhatsappTemplate(payload, userId),
        { new: true, runValidators: true }
    );
    if (!template) throw new AppError('WhatsApp template not found', 404);
    return template;
};

const deleteWhatsappTemplate = async (id) => {
    const template = await WhatsAppTemplate.findByIdAndDelete(id);
    if (!template) throw new AppError('WhatsApp template not found', 404);
    return { success: true };
};

const listEmailLogs = (filters = {}) => {
    const query = {};
    if (filters.deliveryStatus) query.deliveryStatus = filters.deliveryStatus;
    if (filters.relatedType === 'Lead' && filters.relatedId) {
        query.relatedLead = filters.relatedId;
    }
    if (filters.relatedType === 'Customer' && filters.relatedId) {
        query.relatedCustomer = filters.relatedId;
    }
    return populateEmailLog(EmailLog.find(query).sort({ sentAt: -1 }));
};

const createEmailLog = async (payload = {}, userId) => {
    if (!payload.sender?.trim()) throw new AppError('Sender is required', 400);
    if (!payload.recipient?.trim())
        throw new AppError('Recipient is required', 400);
    if (!payload.subject?.trim())
        throw new AppError('Subject is required', 400);

    const log = await EmailLog.create({
        sender: payload.sender,
        recipient: payload.recipient,
        subject: payload.subject,
        body: payload.body || '',
        providerMessageId: payload.providerMessageId || '',
        errorMessage: payload.errorMessage || '',
        deliveryStatus: payload.deliveryStatus || 'Sent',
        openStatus: payload.openStatus || 'Unknown',
        sentAt: payload.sentAt || new Date(),
        templateId: payload.templateId || null,
        createdBy: userId,
        ...buildRelatedFields(payload)
    });
    return populateEmailLog(EmailLog.findById(log._id));
};

const listWhatsappLogs = (filters = {}) => {
    const query = {};
    if (filters.deliveryStatus) query.deliveryStatus = filters.deliveryStatus;
    if (filters.relatedType === 'Lead' && filters.relatedId) {
        query.relatedLead = filters.relatedId;
    }
    if (filters.relatedType === 'Customer' && filters.relatedId) {
        query.relatedCustomer = filters.relatedId;
    }
    return populateWhatsappLog(WhatsAppLog.find(query).sort({ sentAt: -1 }));
};

const createWhatsappLog = async (payload = {}, userId) => {
    if (!payload.recipient?.trim())
        throw new AppError('Recipient is required', 400);

    const log = await WhatsAppLog.create({
        recipient: payload.recipient,
        templateId: payload.templateId || null,
        templateName: payload.templateName || '',
        body: payload.body || '',
        providerMessageId: payload.providerMessageId || '',
        errorMessage: payload.errorMessage || '',
        deliveryStatus: payload.deliveryStatus || 'Sent',
        readStatus: payload.readStatus || 'Unknown',
        sentAt: payload.sentAt || new Date(),
        createdBy: userId,
        ...buildRelatedFields(payload)
    });
    return populateWhatsappLog(WhatsAppLog.findById(log._id));
};

const sendCommunication = async (payload = {}, userId) => {
    const channel = String(payload.channel || '').toLowerCase();
    if (!['email', 'whatsapp'].includes(channel)) {
        throw new AppError('Channel must be email or whatsapp', 400);
    }
    if (!payload.templateId) {
        throw new AppError('Template is required', 400);
    }

    const TemplateModel =
        channel === 'email' ? EmailTemplate : WhatsAppTemplate;
    const template = await TemplateModel.findOne({
        _id: payload.templateId,
        status: 'Active'
    }).lean();
    if (!template) throw new AppError('Active template not found', 404);
    if (channel === 'whatsapp' && template.approvalStatus !== 'Approved') {
        throw new AppError('Only approved WhatsApp templates can be sent', 400);
    }

    const [settings, context] = await Promise.all([
        getSettingsWithSecrets(),
        buildTemplateContext(payload, userId)
    ]);
    if (!settings) {
        throw new AppError(
            'Communication provider is not configured by an administrator',
            400
        );
    }

    const subject = resolvePlaceholders(
        payload.subject || template.subject || '',
        context
    );
    const body = resolvePlaceholders(
        payload.body || template.body || '',
        context
    );
    const unresolved = extractPlaceholders(`${subject} ${body}`);
    if (unresolved.length) {
        throw new AppError(
            `Missing values for placeholders: ${unresolved.join(', ')}`,
            400
        );
    }
    if (!body.trim()) throw new AppError('Message body is required', 400);

    const relatedFields = buildRelatedFields(payload);
    if (channel === 'email') {
        assertSmtpSettings(settings);
        const recipient = String(
            payload.recipient || context.email || ''
        ).trim();
        if (!recipient) throw new AppError('Recipient email is required', 400);
        const sender = `"${settings.smtp.fromName}" <${settings.smtp.fromEmail}>`;
        try {
            const result = await createSmtpTransporter(settings).sendMail({
                from: sender,
                to: recipient,
                subject,
                text: body.replace(/<[^>]*>/g, ''),
                html: body
            });
            const log = await EmailLog.create({
                sender,
                recipient,
                subject,
                body,
                providerMessageId: result.messageId || '',
                deliveryStatus: 'Sent',
                templateId: template._id,
                createdBy: userId,
                ...relatedFields
            });
            return populateEmailLog(EmailLog.findById(log._id));
        } catch (error) {
            await EmailLog.create({
                sender,
                recipient,
                subject,
                body,
                errorMessage: error.message,
                deliveryStatus: 'Failed',
                templateId: template._id,
                createdBy: userId,
                ...relatedFields
            });
            throw new AppError(`Email delivery failed: ${error.message}`, 502);
        }
    }

    if (
        !settings.whatsapp?.enabled ||
        !settings.whatsapp?.phoneNumberId ||
        !settings.whatsapp?.accessTokenEncrypted
    ) {
        throw new AppError(
            'WhatsApp provider is not configured by an administrator',
            400
        );
    }
    const recipient = String(payload.recipient || context.mobile || '').replace(
        /\D/g,
        ''
    );
    if (!recipient) throw new AppError('Recipient mobile is required', 400);
    try {
        const response = await axios.post(
            `${settings.whatsapp.apiBaseUrl}/${settings.whatsapp.phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipient,
                type: 'text',
                text: { preview_url: false, body }
            },
            {
                headers: {
                    Authorization: `Bearer ${decryptSecret(
                        settings.whatsapp.accessTokenEncrypted
                    )}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const providerMessageId = response.data?.messages?.[0]?.id || '';
        const log = await WhatsAppLog.create({
            templateId: template._id,
            templateName: template.name,
            recipient,
            body,
            providerMessageId,
            deliveryStatus: 'Sent',
            createdBy: userId,
            ...relatedFields
        });
        return populateWhatsappLog(WhatsAppLog.findById(log._id));
    } catch (error) {
        const providerError =
            error.response?.data?.error?.message || error.message;
        await WhatsAppLog.create({
            templateId: template._id,
            templateName: template.name,
            recipient,
            body,
            errorMessage: providerError,
            deliveryStatus: 'Failed',
            createdBy: userId,
            ...relatedFields
        });
        throw new AppError(`WhatsApp delivery failed: ${providerError}`, 502);
    }
};

const getCommunicationTimeline = async (relatedType, relatedId) => {
    const [emailLogs, whatsappLogs] = await Promise.all([
        listEmailLogs({ relatedType, relatedId }),
        listWhatsappLogs({ relatedType, relatedId })
    ]);

    return [
        ...emailLogs.map((log) => ({
            _id: `email-${log._id}`,
            channel: 'Email',
            activityType: 'Email Communication',
            description: `${log.subject} sent to ${log.recipient}`,
            deliveryStatus: log.deliveryStatus,
            readStatus: log.openStatus,
            templateName: log.templateId?.name || '',
            recipient: log.recipient,
            createdAt: log.sentAt,
            createdBy: log.createdBy
        })),
        ...whatsappLogs.map((log) => ({
            _id: `whatsapp-${log._id}`,
            channel: 'WhatsApp',
            activityType: 'WhatsApp Communication',
            description: `${log.templateName || log.templateId?.name || 'WhatsApp message'} sent to ${log.recipient}`,
            deliveryStatus: log.deliveryStatus,
            readStatus: log.readStatus,
            templateName: log.templateName || log.templateId?.name || '',
            recipient: log.recipient,
            createdAt: log.sentAt,
            createdBy: log.createdBy
        }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

module.exports = {
    templateCategories,
    listEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    listWhatsappTemplates,
    createWhatsappTemplate,
    updateWhatsappTemplate,
    deleteWhatsappTemplate,
    listEmailLogs,
    createEmailLog,
    listWhatsappLogs,
    createWhatsappLog,
    getCommunicationSettings,
    updateCommunicationSettings,
    testCommunicationSettings,
    resolvePlaceholders,
    sendCommunication,
    getCommunicationTimeline
};
