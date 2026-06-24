const Customer = require('./customer.model');
const AppError = require('../../shared/utils/appError');
const {
    uploadCustomerDocumentToS3,
    deleteFileFromS3
} = require('../../shared/services/s3.service');

const populateCustomer = (query) =>
    query
        .populate('assignedTo', 'name email mobile department profilePhoto')
        .populate('documents.uploadedBy', 'name email')
        .populate('followUps.createdBy', 'name email')
        .populate('meetings.createdBy', 'name email');

const normalizeCustomerPayload = (payload = {}) => ({
    customerName: payload.customerName,
    companyName: payload.companyName,
    mobileNumber: payload.mobileNumber,
    email: payload.email,
    customerType: payload.customerType,
    status: payload.status,
    assignedTo: payload.assignedTo || null,
    gstNumber: payload.gstNumber,
    panNumber: payload.panNumber,
    billingAddress: payload.billingAddress,
    shippingAddress: payload.shippingAddress,
    revenueSummary: payload.revenueSummary,
    orderSummary: payload.orderSummary,
    openOpportunities: payload.openOpportunities,
    followUps: payload.followUps,
    meetings: payload.meetings
});

const removeUndefined = (value) =>
    Object.fromEntries(
        Object.entries(value).filter(
            ([, fieldValue]) => fieldValue !== undefined
        )
    );

const listCustomers = async (filters = {}) => {
    const query = {};

    if (filters.search) {
        const regex = new RegExp(filters.search, 'i');
        query.$or = [
            { customerName: regex },
            { companyName: regex },
            { mobileNumber: regex },
            { email: regex }
        ];
    }

    if (filters.customerType) query.customerType = filters.customerType;
    if (filters.status) query.status = filters.status;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    return populateCustomer(
        Customer.find(query).sort({ createdAt: -1 }).lean()
    );
};

const getCustomerById = async (id) => {
    const customer = await populateCustomer(Customer.findById(id)).lean();
    if (!customer) throw new AppError('Customer not found', 404);
    return customer;
};

const createCustomer = async (payload) => {
    if (!payload.customerName?.trim()) {
        throw new AppError('Customer name is required', 400);
    }

    const customer = await Customer.create(
        removeUndefined(normalizeCustomerPayload(payload))
    );
    return getCustomerById(customer._id);
};

const updateCustomer = async (id, payload) => {
    const customer = await Customer.findByIdAndUpdate(
        id,
        removeUndefined(normalizeCustomerPayload(payload)),
        { new: true, runValidators: true }
    );
    if (!customer) throw new AppError('Customer not found', 404);
    return getCustomerById(id);
};

const deleteCustomer = async (id) => {
    const customer = await Customer.findById(id);
    if (!customer) throw new AppError('Customer not found', 404);

    await Promise.all(
        customer.documents
            .filter((document) => document.filePath)
            .map((document) => deleteFileFromS3(document.filePath))
    );
    await Customer.findByIdAndDelete(id);
    return { success: true };
};

const addContact = async (customerId, payload) => {
    if (!payload.contactName?.trim()) {
        throw new AppError('Contact name is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    if (payload.isPrimaryContact) {
        customer.contacts.forEach((contact) => {
            contact.isPrimaryContact = false;
        });
    }

    customer.contacts.push(payload);
    await customer.save();
    return getCustomerById(customerId);
};

const updateContact = async (customerId, contactId, payload) => {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    const contact = customer.contacts.id(contactId);
    if (!contact) throw new AppError('Contact not found', 404);

    if (payload.isPrimaryContact) {
        customer.contacts.forEach((item) => {
            item.isPrimaryContact = false;
        });
    }

    contact.set(payload);
    await customer.save();
    return getCustomerById(customerId);
};

const deleteContact = async (customerId, contactId) => {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    const contact = customer.contacts.id(contactId);
    if (!contact) throw new AppError('Contact not found', 404);

    contact.deleteOne();
    await customer.save();
    return getCustomerById(customerId);
};

const uploadDocument = async (customerId, file, payload, userId) => {
    if (!file) throw new AppError('No file uploaded', 400);
    if (!payload.documentType) {
        throw new AppError('Document type is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    const filePath = await uploadCustomerDocumentToS3(file, customerId);
    customer.documents.push({
        documentName: payload.documentName || file.originalname,
        documentType: payload.documentType,
        fileName: file.originalname,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId
    });

    await customer.save();
    return getCustomerById(customerId);
};

const deleteDocument = async (customerId, documentId) => {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    const document = customer.documents.id(documentId);
    if (!document) throw new AppError('Document not found', 404);

    await deleteFileFromS3(document.filePath);
    document.deleteOne();
    await customer.save();
    return getCustomerById(customerId);
};

const addFollowUp = async (customerId, payload, userId) => {
    if (!payload.note?.trim() && !payload.title?.trim()) {
        throw new AppError('Follow-up title or note is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    customer.followUps.push({
        title: payload.title || 'Follow-up',
        note: payload.note || '',
        date: payload.date || new Date(),
        createdBy: userId
    });
    await customer.save();
    return getCustomerById(customerId);
};

const addMeeting = async (customerId, payload, userId) => {
    if (!payload.note?.trim() && !payload.title?.trim()) {
        throw new AppError('Meeting title or note is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    customer.meetings.push({
        title: payload.title || 'Meeting',
        note: payload.note || '',
        date: payload.date || new Date(),
        createdBy: userId
    });
    await customer.save();
    return getCustomerById(customerId);
};

const addTransaction = async (customerId, payload) => {
    if (!payload.title?.trim()) {
        throw new AppError('Transaction title is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    const amount = Number(payload.amount || 0);
    const date = payload.date || new Date();

    customer.orderSummary.transactions.push({
        title: payload.title,
        amount,
        date,
        status: payload.status || 'Completed'
    });
    customer.orderSummary.totalOrders =
        Number(customer.orderSummary.totalOrders || 0) + 1;
    customer.orderSummary.lastOrderDate = date;
    customer.revenueSummary.totalRevenue =
        Number(customer.revenueSummary.totalRevenue || 0) + amount;
    customer.revenueSummary.lastTransactionDate = date;

    if (payload.status === 'Pending' || payload.status === 'Overdue') {
        customer.revenueSummary.outstandingAmount =
            Number(customer.revenueSummary.outstandingAmount || 0) + amount;
    }

    await customer.save();
    return getCustomerById(customerId);
};

const addOpportunity = async (customerId, payload) => {
    if (!payload.title?.trim()) {
        throw new AppError('Opportunity title is required', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    customer.openOpportunities.push({
        title: payload.title,
        value: Number(payload.value || 0),
        stage: payload.stage || 'Open',
        expectedCloseDate: payload.expectedCloseDate || null
    });
    await customer.save();
    return getCustomerById(customerId);
};

module.exports = {
    listCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addContact,
    updateContact,
    deleteContact,
    uploadDocument,
    deleteDocument,
    addFollowUp,
    addMeeting,
    addTransaction,
    addOpportunity
};
