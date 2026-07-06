const ProjectActivity = require('./projectActivity.model');

const FIELD_LABELS = {
    projectName: 'Project name',
    projectValue: 'Project value',
    contractStartDate: 'Contract start date',
    contractEndDate: 'Contract end date',
    billingFrequency: 'Billing frequency',
    recurringInvoiceAmount: 'Recurring invoice amount',
    invoiceTaxRate: 'Invoice tax rate',
    invoiceDueDays: 'Invoice due days',
    paymentTerms: 'Payment terms',
    status: 'Status',
    milestones: 'Milestones',
    contractDocuments: 'Contract documents'
};

const comparable = (value) => {
    if (value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (value?.toObject) return value.toObject();
    return value;
};

const sameValue = (left, right) =>
    JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));

const buildProjectChanges = (before, after, fields) =>
    fields
        .filter((field) => !sameValue(before?.[field], after?.[field]))
        .map((field) => ({
            field,
            label: FIELD_LABELS[field] || field,
            oldValue: comparable(before?.[field]),
            newValue: comparable(after?.[field])
        }));

const requestAuditContext = (req) => ({
    userId: req.user?.userId || null,
    actorType: req.user?.userId ? 'USER' : 'SYSTEM',
    ipAddress:
        req.ip ||
        req.headers?.['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '',
    userAgent: req.headers?.['user-agent'] || '',
    source: 'API'
});

const recordProjectActivity = async (activity, options = {}) => {
    const [created] = await ProjectActivity.create([activity], {
        session: options.session || null
    });
    return created;
};

const listProjectActivities = async (customerId, projectId, filters = {}) => {
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 250);
    const query = { customerId, projectId };
    if (filters.action) query.action = filters.action;
    if (filters.before) query.occurredAt = { $lt: new Date(filters.before) };

    return await ProjectActivity.find(query)
        .populate('userId', 'name email profilePhoto')
        .sort({ occurredAt: -1, _id: -1 })
        .limit(limit)
        .lean();
};

const searchProjectActivities = async (filters = {}) => {
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 250);
    const query = {};
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.from || filters.to) {
        query.occurredAt = {};
        if (filters.from) query.occurredAt.$gte = new Date(filters.from);
        if (filters.to) query.occurredAt.$lte = new Date(filters.to);
    }
    if (filters.before) {
        query.occurredAt = {
            ...(query.occurredAt || {}),
            $lt: new Date(filters.before)
        };
    }

    return await ProjectActivity.find(query)
        .populate('userId', 'name email profilePhoto')
        .populate('customerId', 'customerName companyName')
        .sort({ occurredAt: -1, _id: -1 })
        .limit(limit)
        .lean();
};

module.exports = {
    buildProjectChanges,
    requestAuditContext,
    recordProjectActivity,
    listProjectActivities,
    searchProjectActivities
};
