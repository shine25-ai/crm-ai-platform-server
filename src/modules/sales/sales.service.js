const {
    SalesOpportunity,
    SalesQuotation,
    SalesFollowUp,
    SalesMeeting
} = require('./sales.model');
const AppError = require('../../shared/utils/appError');

const populateOpportunity = (query) =>
    query
        .populate('customerId', 'customerName companyName')
        .populate('assignedTo', 'name email');
const populateQuotation = (query) =>
    query
        .populate('customerId', 'customerName companyName')
        .populate('opportunityId', 'opportunityName');
const populateActivity = (query) =>
    query
        .populate('customerId', 'customerName companyName')
        .populate('opportunityId', 'opportunityName')
        .populate('assignedTo', 'name email');
const populateMeeting = (query) =>
    query
        .populate('customerId', 'customerName companyName')
        .populate('assignedTo', 'name email');

const buildFilter = (filters, searchableFields = []) => {
    const query = {};
    if (filters.search) {
        const regex = new RegExp(filters.search, 'i');
        query.$or = searchableFields.map((field) => ({ [field]: regex }));
    }
    if (filters.stage) query.stage = filters.stage;
    if (filters.status) query.status = filters.status;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    return query;
};

const listOpportunities = (filters = {}) =>
    populateOpportunity(
        SalesOpportunity.find(
            buildFilter(filters, ['opportunityName', 'leadName', 'notes'])
        ).sort({ createdAt: -1 })
    );

const createOpportunity = async (payload) => {
    if (!payload.opportunityName?.trim()) {
        throw new AppError('Opportunity name is required', 400);
    }
    const opportunity = await SalesOpportunity.create(payload);
    return populateOpportunity(SalesOpportunity.findById(opportunity._id));
};

const updateOpportunity = async (id, payload) => {
    const opportunity = await SalesOpportunity.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true
    });
    if (!opportunity) throw new AppError('Opportunity not found', 404);
    return populateOpportunity(SalesOpportunity.findById(id));
};

const deleteOpportunity = async (id) => {
    const opportunity = await SalesOpportunity.findByIdAndDelete(id);
    if (!opportunity) throw new AppError('Opportunity not found', 404);
    return { success: true };
};

const moveOpportunityStage = (id, stage) => updateOpportunity(id, { stage });

const calculateQuotationTotals = (items = []) => {
    let subTotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    const normalizedItems = items.map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const taxRate = Number(item.taxRate || 0);
        const discount = Number(item.discount || 0);
        const lineBase = quantity * unitPrice;
        const lineTax = (lineBase * taxRate) / 100;
        const total = lineBase + lineTax - discount;
        subTotal += lineBase;
        taxAmount += lineTax;
        discountAmount += discount;
        return { ...item, quantity, unitPrice, taxRate, discount, total };
    });
    return {
        items: normalizedItems,
        subTotal,
        taxAmount,
        discountAmount,
        totalAmount: subTotal + taxAmount - discountAmount
    };
};

const nextQuotationNumber = async () => {
    const count = await SalesQuotation.countDocuments();
    return `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
};

const listQuotations = () =>
    populateQuotation(SalesQuotation.find().sort({ createdAt: -1 }));

const createQuotation = async (payload) => {
    if (!payload.customerId) throw new AppError('Customer is required', 400);
    const totals = calculateQuotationTotals(payload.items || []);
    const quotation = await SalesQuotation.create({
        ...payload,
        quotationNumber:
            payload.quotationNumber || (await nextQuotationNumber()),
        ...totals
    });
    return populateQuotation(SalesQuotation.findById(quotation._id));
};

const updateQuotation = async (id, payload) => {
    const totals = payload.items ? calculateQuotationTotals(payload.items) : {};
    const quotation = await SalesQuotation.findByIdAndUpdate(
        id,
        { ...payload, ...totals },
        { new: true, runValidators: true }
    );
    if (!quotation) throw new AppError('Quotation not found', 404);
    return populateQuotation(SalesQuotation.findById(id));
};

const deleteQuotation = async (id) => {
    const quotation = await SalesQuotation.findByIdAndDelete(id);
    if (!quotation) throw new AppError('Quotation not found', 404);
    return { success: true };
};

const sendQuotation = async (id) => {
    const quotation = await SalesQuotation.findByIdAndUpdate(
        id,
        { status: 'Sent', sentAt: new Date() },
        { new: true }
    );
    if (!quotation) throw new AppError('Quotation not found', 404);
    return populateQuotation(SalesQuotation.findById(id));
};

const listFollowUps = (filters = {}) =>
    populateActivity(
        SalesFollowUp.find(buildFilter(filters, ['leadName', 'notes'])).sort({
            followUpDate: 1
        })
    );

const createFollowUp = async (payload) => {
    if (!payload.followUpDate)
        throw new AppError('Follow-up date is required', 400);
    const followUp = await SalesFollowUp.create(payload);
    return populateActivity(SalesFollowUp.findById(followUp._id));
};

const updateFollowUp = async (id, payload) => {
    const item = await SalesFollowUp.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true
    });
    if (!item) throw new AppError('Follow-up not found', 404);
    return populateActivity(SalesFollowUp.findById(id));
};

const deleteFollowUp = async (id) => {
    const item = await SalesFollowUp.findByIdAndDelete(id);
    if (!item) throw new AppError('Follow-up not found', 404);
    return { success: true };
};

const listMeetings = (filters = {}) =>
    populateMeeting(
        SalesMeeting.find(
            buildFilter(filters, ['meetingTitle', 'leadName'])
        ).sort({
            meetingDate: 1
        })
    );

const createMeeting = async (payload) => {
    if (!payload.meetingTitle?.trim())
        throw new AppError('Meeting title is required', 400);
    const meeting = await SalesMeeting.create(payload);
    return populateMeeting(SalesMeeting.findById(meeting._id));
};

const updateMeeting = async (id, payload) => {
    const item = await SalesMeeting.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true
    });
    if (!item) throw new AppError('Meeting not found', 404);
    return populateMeeting(SalesMeeting.findById(id));
};

const deleteMeeting = async (id) => {
    const item = await SalesMeeting.findByIdAndDelete(id);
    if (!item) throw new AppError('Meeting not found', 404);
    return { success: true };
};

module.exports = {
    listOpportunities,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    moveOpportunityStage,
    listQuotations,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    sendQuotation,
    listFollowUps,
    createFollowUp,
    updateFollowUp,
    deleteFollowUp,
    listMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting
};
