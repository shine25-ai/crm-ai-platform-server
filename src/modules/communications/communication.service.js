const {
    EmailTemplate,
    WhatsAppTemplate,
    EmailLog,
    WhatsAppLog,
    templateCategories
} = require('./communication.model');
const AppError = require('../../shared/utils/appError');

const extractPlaceholders = (value = '') => {
    const matches = String(value).match(/{{\s*[\w.]+\s*}}/g) || [];
    return [
        ...new Set(matches.map((item) => item.replace(/[{}]/g, '').trim()))
    ];
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
        deliveryStatus: payload.deliveryStatus || 'Sent',
        readStatus: payload.readStatus || 'Unknown',
        sentAt: payload.sentAt || new Date(),
        createdBy: userId,
        ...buildRelatedFields(payload)
    });
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
    listEmailLogs,
    createEmailLog,
    listWhatsappLogs,
    createWhatsappLog,
    getCommunicationTimeline
};
