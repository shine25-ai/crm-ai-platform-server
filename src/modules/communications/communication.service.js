const {
    EmailTemplate,
    WhatsAppTemplate,
    InvoiceTemplate,
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

const normalizeList = (value = []) => {
    if (Array.isArray(value))
        return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const resolveContextValue = (key = '', context = {}) => {
    const normalizedContext = Object.entries(context).reduce(
        (result, [contextKey, item]) => ({
            ...result,
            [normalizePlaceholderKey(contextKey)]: item ?? ''
        }),
        {}
    );
    return normalizedContext[normalizePlaceholderKey(key)] ?? '';
};

const buildTemplateTextParameters = (keys = [], context = {}) =>
    normalizeList(keys)
        .map((key) => resolveContextValue(key, context))
        .filter((value) => value !== undefined && value !== null)
        .map((value) => ({
            type: 'text',
            text: String(value)
        }));

const getSettingsWithSecrets = () =>
    CommunicationSetting.findOne({ key: 'default' }).select(
        '+smtp.passwordEncrypted +whatsapp.accessTokenEncrypted +whatsapp.webhookVerifyTokenEncrypted +whatsapp.appSecretEncrypted'
    );

const parseDateOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

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
        whatsappBusinessAccountId:
            settings?.whatsapp?.whatsappBusinessAccountId || '',
        businessPortfolioId: settings?.whatsapp?.businessPortfolioId || '',
        registeredPhoneNumber: settings?.whatsapp?.registeredPhoneNumber || '',
        webhookCallbackBaseUrl:
            settings?.whatsapp?.webhookCallbackBaseUrl || '',
        accessTokenConfigured: Boolean(
            settings?.whatsapp?.accessTokenEncrypted
        ),
        webhookVerifyTokenConfigured: Boolean(
            settings?.whatsapp?.webhookVerifyTokenEncrypted
        ),
        appId: settings?.whatsapp?.appId || '',
        appSecretConfigured: Boolean(settings?.whatsapp?.appSecretEncrypted),
        autoRefreshToken: settings?.whatsapp?.autoRefreshToken !== false,
        tokenExpiresAt: settings?.whatsapp?.tokenExpiresAt || null,
        lastTokenRefreshAt: settings?.whatsapp?.lastTokenRefreshAt || null,
        tokenRefreshStatus:
            settings?.whatsapp?.tokenRefreshStatus === 'Not Configured' &&
            settings?.whatsapp?.accessTokenEncrypted
                ? 'Active'
                : settings?.whatsapp?.tokenRefreshStatus || 'Not Configured',
        tokenRefreshError: settings?.whatsapp?.tokenRefreshError || ''
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
        settings.whatsapp.whatsappBusinessAccountId = String(
            payload.whatsapp.whatsappBusinessAccountId || ''
        ).trim();
        settings.whatsapp.businessPortfolioId = String(
            payload.whatsapp.businessPortfolioId || ''
        ).trim();
        settings.whatsapp.registeredPhoneNumber = String(
            payload.whatsapp.registeredPhoneNumber || ''
        ).trim();
        settings.whatsapp.webhookCallbackBaseUrl = String(
            payload.whatsapp.webhookCallbackBaseUrl || ''
        )
            .trim()
            .replace(/\/+$/, '');
        settings.whatsapp.appId = String(payload.whatsapp.appId || '').trim();
        settings.whatsapp.autoRefreshToken =
            payload.whatsapp.autoRefreshToken !== false;
        settings.whatsapp.tokenExpiresAt = parseDateOrNull(
            payload.whatsapp.tokenExpiresAt
        );
        if (payload.whatsapp.appSecret) {
            settings.whatsapp.appSecretEncrypted = encryptSecret(
                payload.whatsapp.appSecret
            );
        }
        if (payload.whatsapp.accessToken) {
            settings.whatsapp.accessTokenEncrypted = encryptSecret(
                payload.whatsapp.accessToken
            );
            settings.whatsapp.tokenRefreshStatus = 'Active';
            settings.whatsapp.tokenRefreshError = '';
        }
        if (payload.whatsapp.webhookVerifyToken) {
            settings.whatsapp.webhookVerifyTokenEncrypted = encryptSecret(
                payload.whatsapp.webhookVerifyToken
            );
        }
    }

    settings.updatedBy = userId;
    await settings.save();
    return publicSettings(settings);
};

const getWhatsappAccessToken = (settings) =>
    decryptSecret(settings.whatsapp.accessTokenEncrypted);

const refreshWhatsappAccessToken = async () => {
    const settings = await getSettingsWithSecrets();
    if (!settings) throw new AppError('Communication settings not found', 404);

    const missing = [];
    if (!settings.whatsapp?.accessTokenEncrypted) missing.push('access token');
    if (!settings.whatsapp?.appId) missing.push('Meta app id');
    if (!settings.whatsapp?.appSecretEncrypted) missing.push('Meta app secret');
    if (missing.length) {
        throw new AppError(
            `WhatsApp token refresh is incomplete: ${missing.join(', ')}`,
            400
        );
    }

    try {
        const response = await axios.get(
            `${settings.whatsapp.apiBaseUrl}/oauth/access_token`,
            {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: settings.whatsapp.appId,
                    client_secret: decryptSecret(
                        settings.whatsapp.appSecretEncrypted
                    ),
                    fb_exchange_token: getWhatsappAccessToken(settings)
                }
            }
        );
        const nextToken = response.data?.access_token;
        if (!nextToken) {
            throw new AppError('Meta did not return a refreshed token', 502);
        }

        settings.whatsapp.accessTokenEncrypted = encryptSecret(nextToken);
        settings.whatsapp.tokenExpiresAt = response.data?.expires_in
            ? new Date(Date.now() + Number(response.data.expires_in) * 1000)
            : null;
        settings.whatsapp.lastTokenRefreshAt = new Date();
        settings.whatsapp.tokenRefreshStatus = 'Active';
        settings.whatsapp.tokenRefreshError = '';
        await settings.save();
        return publicSettings(settings);
    } catch (error) {
        const providerError =
            error.response?.data?.error?.message || error.message;
        settings.whatsapp.tokenRefreshStatus = 'Failed';
        settings.whatsapp.tokenRefreshError = providerError;
        await settings.save().catch(() => {});
        throw new AppError(
            `WhatsApp token refresh failed: ${providerError}`,
            error.statusCode || 502
        );
    }
};

const ensureFreshWhatsappAccessToken = async (settings) => {
    if (
        !settings.whatsapp?.autoRefreshToken ||
        !settings.whatsapp?.tokenExpiresAt
    ) {
        return getWhatsappAccessToken(settings);
    }

    const refreshWindowMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(settings.whatsapp.tokenExpiresAt).getTime();
    if (Number.isNaN(expiresAt) || expiresAt - Date.now() > refreshWindowMs) {
        return getWhatsappAccessToken(settings);
    }

    await refreshWhatsappAccessToken();
    const refreshedSettings = await getSettingsWithSecrets();
    return getWhatsappAccessToken(refreshedSettings);
};

const verifyWhatsappWebhook = async ({ mode, token, challenge }) => {
    if (mode !== 'subscribe' || !token || !challenge) {
        throw new AppError(
            'Invalid WhatsApp webhook verification request',
            400
        );
    }

    const settings = await getSettingsWithSecrets();
    if (!settings?.whatsapp?.webhookVerifyTokenEncrypted) {
        throw new AppError(
            'WhatsApp webhook verify token is not configured',
            400
        );
    }

    const expectedToken = decryptSecret(
        settings.whatsapp.webhookVerifyTokenEncrypted
    );
    if (token !== expectedToken) {
        throw new AppError('WhatsApp webhook verify token mismatch', 403);
    }

    return challenge;
};

const mapWhatsappStatus = (status = '') => {
    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus === 'failed') return 'Failed';
    if (normalizedStatus === 'delivered') return 'Delivered';
    if (normalizedStatus === 'read') return 'Delivered';
    return 'Sent';
};

const handleWhatsappWebhook = async (payload = {}) => {
    const changes =
        payload.entry?.flatMap((entry) => entry.changes || []) || [];
    let statusUpdates = 0;
    let incomingMessages = 0;

    for (const change of changes) {
        const value = change.value || {};
        const statuses = value.statuses || [];
        const messages = value.messages || [];

        for (const item of statuses) {
            const update = {
                deliveryStatus: mapWhatsappStatus(item.status)
            };
            if (String(item.status).toLowerCase() === 'read') {
                update.readStatus = 'Read';
            }
            if (item.errors?.length) {
                update.errorMessage = item.errors
                    .map((error) => error.message || error.title || error.code)
                    .filter(Boolean)
                    .join('; ');
            }
            const result = await WhatsAppLog.updateOne(
                { providerMessageId: item.id },
                { $set: update }
            );
            statusUpdates += result.modifiedCount || 0;
        }

        for (const message of messages) {
            const body =
                message.text?.body ||
                message.button?.text ||
                message.interactive?.button_reply?.title ||
                message.interactive?.list_reply?.title ||
                message.type ||
                '';
            await WhatsAppLog.create({
                templateName: 'Incoming WhatsApp message',
                recipient: message.from,
                body,
                providerMessageId: message.id || '',
                deliveryStatus: 'Received',
                readStatus: 'Unread'
            });
            incomingMessages += 1;
        }
    }

    return { received: true, statusUpdates, incomingMessages };
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
        try {
            await createSmtpTransporter(settings).verify();
            return { channel, connected: true };
        } catch (error) {
            throw new AppError(`SMTP connection failed: ${error.message}`, 502);
        }
    }
    if (channel === 'whatsapp') {
        if (
            !settings.whatsapp?.enabled ||
            !settings.whatsapp?.phoneNumberId ||
            !settings.whatsapp?.accessTokenEncrypted
        ) {
            throw new AppError('WhatsApp configuration is incomplete', 400);
        }
        try {
            await axios.get(
                `${settings.whatsapp.apiBaseUrl}/${settings.whatsapp.phoneNumberId}`,
                {
                    headers: {
                        Authorization: `Bearer ${await ensureFreshWhatsappAccessToken(settings)}`
                    }
                }
            );
            return { channel, connected: true };
        } catch (error) {
            const providerError =
                error.response?.data?.error?.message || error.message;
            const providerCode = error.response?.data?.error?.code;
            throw new AppError(
                `WhatsApp connection failed: ${providerError}${
                    providerCode ? ` (#${providerCode})` : ''
                }`,
                502
            );
        }
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
        metaTemplateName: payload.metaTemplateName || '',
        languageCode: payload.languageCode || 'en_US',
        category: payload.category || 'General',
        body: payload.body,
        placeholders,
        headerParameters: normalizeList(payload.headerParameters),
        bodyParameters: normalizeList(payload.bodyParameters),
        buttonParameters: normalizeList(payload.buttonParameters),
        metaApprovalStatus: payload.metaApprovalStatus || 'Not Synced',
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

const listInvoiceTemplates = (filters = {}) =>
    populateTemplate(
        InvoiceTemplate.find(buildQuery(filters)).sort({
            isDefault: -1,
            createdAt: -1
        })
    );

const normalizeInvoiceTemplate = (payload = {}, userId) => {
    if (!payload.name?.trim()) {
        throw new AppError('Invoice template name is required', 400);
    }
    if (!/^#[0-9a-f]{6}$/i.test(payload.primaryColor || '#4F46E5')) {
        throw new AppError('Primary color must be a valid hex color', 400);
    }
    return {
        name: payload.name.trim(),
        title: payload.title || 'CRM AI Platform',
        subtitle: payload.subtitle || 'Project billing invoice',
        primaryColor: payload.primaryColor || '#4F46E5',
        footerText: payload.footerText || 'Thank you for your business.',
        isDefault: Boolean(payload.isDefault),
        status: payload.status || 'Active',
        createdBy: userId
    };
};

const clearOtherDefaultInvoiceTemplates = async (templateId = null) => {
    const query = templateId ? { _id: { $ne: templateId } } : {};
    await InvoiceTemplate.updateMany(query, { $set: { isDefault: false } });
};

const createInvoiceTemplate = async (payload, userId) => {
    const data = normalizeInvoiceTemplate(payload, userId);
    if (data.isDefault) await clearOtherDefaultInvoiceTemplates();
    return InvoiceTemplate.create(data);
};

const updateInvoiceTemplate = async (id, payload, userId) => {
    const data = normalizeInvoiceTemplate(payload, userId);
    if (data.isDefault) await clearOtherDefaultInvoiceTemplates(id);
    const template = await InvoiceTemplate.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
    });
    if (!template) throw new AppError('Invoice template not found', 404);
    return template;
};

const deleteInvoiceTemplate = async (id) => {
    const template = await InvoiceTemplate.findByIdAndDelete(id);
    if (!template) throw new AppError('Invoice template not found', 404);
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

const buildWhatsappTemplateMessage = (template, context) => {
    const components = [];
    const headerParameters = buildTemplateTextParameters(
        template.headerParameters,
        context
    );
    const bodyParameters = buildTemplateTextParameters(
        template.bodyParameters,
        context
    );
    const buttonParameters = buildTemplateTextParameters(
        template.buttonParameters,
        context
    );

    if (headerParameters.length) {
        components.push({
            type: 'header',
            parameters: headerParameters
        });
    }
    if (bodyParameters.length) {
        components.push({
            type: 'body',
            parameters: bodyParameters
        });
    }
    if (buttonParameters.length) {
        components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: buttonParameters
        });
    }

    return {
        type: 'template',
        template: {
            name: template.metaTemplateName,
            language: {
                code: template.languageCode || 'en_US'
            },
            ...(components.length ? { components } : {})
        }
    };
};

const sendCommunication = async (payload = {}, userId) => {
    const channel = String(payload.channel || '').toLowerCase();
    if (!['email', 'whatsapp'].includes(channel)) {
        throw new AppError('Channel must be email or whatsapp', 400);
    }

    const TemplateModel =
        channel === 'email' ? EmailTemplate : WhatsAppTemplate;
    const template = payload.templateId
        ? await TemplateModel.findOne({
              _id: payload.templateId,
              status: 'Active'
          }).lean()
        : null;
    if (payload.templateId && !template) {
        throw new AppError('Active template not found', 404);
    }
    if (
        channel === 'whatsapp' &&
        template &&
        template.approvalStatus !== 'Approved'
    ) {
        throw new AppError('Only approved WhatsApp templates can be sent', 400);
    }
    if (
        channel === 'whatsapp' &&
        template?.metaTemplateName &&
        template.metaApprovalStatus !== 'Approved'
    ) {
        throw new AppError(
            'Meta WhatsApp template must be marked as approved before sending',
            400
        );
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
        payload.subject || template?.subject || '',
        context
    );
    const body = resolvePlaceholders(
        payload.body || template?.body || '',
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
    if (channel === 'email' && !subject.trim()) {
        throw new AppError('Email subject is required', 400);
    }

    const relatedFields = buildRelatedFields(payload);
    if (channel === 'email') {
        assertSmtpSettings(settings);
        const recipient = String(
            payload.recipient || context.email || ''
        ).trim();
        if (!recipient) throw new AppError('Recipient email is required', 400);
        const sender = `"${settings.smtp.fromName}" <${settings.smtp.fromEmail}>`;
        const log = await EmailLog.create({
            sender,
            recipient,
            subject,
            body,
            deliveryStatus: 'Queued',
            templateId: template?._id || null,
            createdBy: userId,
            ...relatedFields
        });
        let result;
        try {
            result = await createSmtpTransporter(settings).sendMail({
                from: sender,
                to: recipient,
                subject,
                text: body.replace(/<[^>]*>/g, ''),
                html: body
            });
        } catch (error) {
            await EmailLog.updateOne(
                { _id: log._id },
                {
                    $set: {
                        errorMessage: error.message,
                        deliveryStatus: 'Failed'
                    }
                }
            ).catch(() => {});
            throw new AppError(`Email delivery failed: ${error.message}`, 502);
        }
        await EmailLog.updateOne(
            { _id: log._id },
            {
                $set: {
                    providerMessageId: result.messageId || '',
                    deliveryStatus: 'Sent'
                }
            }
        ).catch(() => {});
        return populateEmailLog(EmailLog.findById(log._id));
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
    const useMetaTemplate = Boolean(template?.metaTemplateName);
    const log = await WhatsAppLog.create({
        templateId: template?._id || null,
        templateName: template?.name || 'Custom message',
        recipient,
        body,
        deliveryStatus: 'Queued',
        createdBy: userId,
        ...relatedFields
    });
    let response;
    const whatsappMessagePayload = useMetaTemplate
        ? buildWhatsappTemplateMessage(template, context)
        : {
              type: 'text',
              text: { preview_url: false, body }
          };
    try {
        const accessToken = await ensureFreshWhatsappAccessToken(settings);
        response = await axios.post(
            `${settings.whatsapp.apiBaseUrl}/${settings.whatsapp.phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipient,
                ...whatsappMessagePayload
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        const providerError =
            error.response?.data?.error?.message || error.message;
        await WhatsAppLog.updateOne(
            { _id: log._id },
            {
                $set: {
                    errorMessage: providerError,
                    deliveryStatus: 'Failed'
                }
            }
        ).catch(() => {});
        throw new AppError(`WhatsApp delivery failed: ${providerError}`, 502);
    }
    const providerMessageId = response.data?.messages?.[0]?.id || '';
    await WhatsAppLog.updateOne(
        { _id: log._id },
        {
            $set: {
                providerMessageId,
                deliveryStatus: 'Sent'
            }
        }
    ).catch(() => {});
    return populateWhatsappLog(WhatsAppLog.findById(log._id));
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
    listInvoiceTemplates,
    createInvoiceTemplate,
    updateInvoiceTemplate,
    deleteInvoiceTemplate,
    listEmailLogs,
    createEmailLog,
    listWhatsappLogs,
    createWhatsappLog,
    getCommunicationSettings,
    updateCommunicationSettings,
    refreshWhatsappAccessToken,
    verifyWhatsappWebhook,
    handleWhatsappWebhook,
    testCommunicationSettings,
    resolvePlaceholders,
    sendCommunication,
    getCommunicationTimeline
};
