const Customer = require('./customer.model');
const AppError = require('../../shared/utils/appError');
const {
    uploadCustomerDocumentToS3,
    deleteFileFromS3
} = require('../../shared/services/s3.service');
const communicationService = require('../communications/communication.service');

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
    meetings: payload.meetings,
    projectEngagements: payload.projectEngagements
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
    customer.communicationTimeline =
        await communicationService.getCommunicationTimeline('Customer', id);
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

const nextInvoiceNumber = (customer, invoiceDate = new Date()) => {
    const invoiceCount = (customer.projectEngagements || []).reduce(
        (count, engagement) => count + (engagement.invoices || []).length,
        0
    );
    return `INV-${invoiceDate.getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
};

const startOfDay = (value = new Date()) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AppError('A valid billing date is required', 400);
    }
    date.setHours(0, 0, 0, 0);
    return date;
};

const dateKey = (value) => {
    const date = new Date(value);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
};

const addAnchoredMonths = (startDate, monthCount) => {
    const start = startOfDay(startDate);
    const target = new Date(
        start.getFullYear(),
        start.getMonth() + monthCount,
        1
    );
    const lastDay = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0
    ).getDate();
    target.setDate(Math.min(start.getDate(), lastDay));
    return target;
};

const calculateInvoiceAmounts = (amount, taxRate = 18) => {
    const taxableAmount = Math.round(Number(amount || 0) * 100) / 100;
    const taxAmount =
        Math.round(((taxableAmount * Number(taxRate || 0)) / 100) * 100) / 100;
    return {
        amount: taxableAmount,
        taxableAmount,
        taxDetails: {
            label: 'GST',
            rate: Number(taxRate || 0),
            amount: taxAmount
        },
        totalAmount: taxableAmount + taxAmount
    };
};

const addProjectEngagement = async (customerId, payload) => {
    if (!payload.projectName?.trim()) {
        throw new AppError('Project name is required', 400);
    }

    const projectValue = Number(payload.projectValue || 0);
    if (projectValue <= 0) {
        throw new AppError('Project value must be greater than zero', 400);
    }

    const billingFrequency = payload.billingFrequency || 'Milestone';
    const contractStartDate = payload.contractStartDate
        ? startOfDay(payload.contractStartDate)
        : null;
    const contractEndDate = payload.contractEndDate
        ? startOfDay(payload.contractEndDate)
        : null;

    if (
        contractStartDate &&
        contractEndDate &&
        contractEndDate < contractStartDate
    ) {
        throw new AppError(
            'Contract end date cannot be before the start date',
            400
        );
    }
    const invoiceTaxRate = Number(payload.invoiceTaxRate ?? 18);
    const invoiceDueDays = Number(payload.invoiceDueDays ?? 15);
    if (invoiceTaxRate < 0 || invoiceDueDays < 0) {
        throw new AppError(
            'Invoice tax rate and due days cannot be negative',
            400
        );
    }

    let milestones = [];
    let recurringInvoiceAmount = 0;
    if (billingFrequency === 'Milestone') {
        milestones = (payload.milestones || []).map((milestone) => ({
            name: String(milestone.name || '').trim(),
            percentage: Number(milestone.percentage || 0),
            dueDate: milestone.dueDate ? startOfDay(milestone.dueDate) : null
        }));
        if (
            milestones.length === 0 ||
            milestones.some(
                (milestone) =>
                    !milestone.name ||
                    milestone.percentage <= 0 ||
                    !milestone.dueDate
            )
        ) {
            throw new AppError(
                'Every milestone requires a name, positive percentage, and due date',
                400
            );
        }
        const percentageTotal = milestones.reduce(
            (sum, milestone) => sum + milestone.percentage,
            0
        );
        if (Math.abs(percentageTotal - 100) > 0.001) {
            throw new AppError(
                `Milestone percentages must total 100% (currently ${percentageTotal}%)`,
                400
            );
        }
        if (
            milestones.some(
                (milestone) =>
                    (contractStartDate &&
                        milestone.dueDate < contractStartDate) ||
                    (contractEndDate && milestone.dueDate > contractEndDate)
            )
        ) {
            throw new AppError(
                'Milestone dates must fall within the contract dates',
                400
            );
        }
    } else {
        if (!contractStartDate) {
            throw new AppError(
                'Contract start date is required for recurring billing',
                400
            );
        }
        recurringInvoiceAmount = Number(payload.recurringInvoiceAmount || 0);
        if (recurringInvoiceAmount <= 0) {
            throw new AppError(
                'Recurring invoice amount must be greater than zero',
                400
            );
        }
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    customer.projectEngagements.push({
        projectName: payload.projectName.trim(),
        projectValue,
        contractStartDate,
        contractEndDate,
        billingFrequency,
        recurringInvoiceAmount,
        invoiceTaxRate,
        invoiceDueDays,
        paymentTerms: payload.paymentTerms || '',
        milestones,
        contractDocuments: payload.contractDocuments || [],
        status: payload.status || 'Active'
    });

    await customer.save();
    return getCustomerById(customerId);
};

const generateDueInvoicesForEngagement = (
    customer,
    engagement,
    payload = {}
) => {
    const taxRate = Number(payload.taxRate ?? engagement.invoiceTaxRate ?? 18);
    const dueDays = Number(payload.dueDays ?? engagement.invoiceDueDays ?? 15);
    const invoiceDate = startOfDay(
        payload.asOfDate || payload.invoiceDate || new Date()
    );
    const buildDueDate = (baseDate = invoiceDate) => {
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + dueDays);
        return dueDate;
    };

    const generated = [];

    if (engagement.billingFrequency === 'Milestone') {
        engagement.milestones.forEach((milestone) => {
            if (milestone.status === 'Invoiced' || milestone.status === 'Paid')
                return;
            if (
                !milestone.dueDate ||
                startOfDay(milestone.dueDate) > invoiceDate
            )
                return;

            const scheduleKey = `milestone:${milestone._id}`;
            if (
                engagement.invoices.some(
                    (invoice) => invoice.scheduleKey === scheduleKey
                )
            )
                return;

            const baseAmount =
                (Number(engagement.projectValue || 0) *
                    Number(milestone.percentage || 0)) /
                100;
            const invoice = {
                invoiceNumber: nextInvoiceNumber(customer, invoiceDate),
                projectName: engagement.projectName,
                invoiceDate,
                dueDate: buildDueDate(),
                paymentStatus: 'Pending',
                milestoneName: milestone.name,
                billingFrequency: engagement.billingFrequency,
                scheduleKey,
                scheduleDate: milestone.dueDate,
                notes: `${milestone.percentage}% milestone invoice`,
                ...calculateInvoiceAmounts(baseAmount, taxRate)
            };
            engagement.invoices.push(invoice);
            milestone.status = 'Invoiced';
            milestone.invoiceNumber = invoice.invoiceNumber;
            milestone.invoicedAt = invoiceDate;
            generated.push(invoice);
        });
    } else {
        const frequencyMonths = {
            Monthly: 1,
            Quarterly: 3,
            Annual: 12
        };
        const months = frequencyMonths[engagement.billingFrequency] || 1;
        const installmentAmount = Number(
            engagement.recurringInvoiceAmount || 0
        );
        if (!engagement.contractStartDate || installmentAmount <= 0) {
            throw new AppError(
                'Recurring billing requires a contract start date and recurring invoice amount',
                400
            );
        }

        const contractEnd = engagement.contractEndDate
            ? startOfDay(engagement.contractEndDate)
            : null;
        let cycleIndex = 0;
        let periodStart = addAnchoredMonths(
            engagement.contractStartDate,
            cycleIndex
        );

        while (
            periodStart <= invoiceDate &&
            (!contractEnd || periodStart <= contractEnd)
        ) {
            const nextPeriodStart = addAnchoredMonths(
                engagement.contractStartDate,
                cycleIndex + months
            );
            const scheduleKey = `recurring:${engagement.billingFrequency.toLowerCase()}:${dateKey(periodStart)}`;
            const alreadyGenerated = engagement.invoices.some(
                (invoice) => invoice.scheduleKey === scheduleKey
            );

            if (!alreadyGenerated) {
                const calculatedPeriodEnd = new Date(
                    nextPeriodStart.getTime() - 1
                );
                const periodEnd =
                    contractEnd && calculatedPeriodEnd > contractEnd
                        ? contractEnd
                        : calculatedPeriodEnd;
                const invoice = {
                    invoiceNumber: nextInvoiceNumber(customer, invoiceDate),
                    projectName: engagement.projectName,
                    invoiceDate,
                    dueDate: buildDueDate(),
                    paymentStatus: 'Pending',
                    billingFrequency: engagement.billingFrequency,
                    scheduleKey,
                    scheduleDate: periodStart,
                    periodStart,
                    periodEnd,
                    notes: `${engagement.billingFrequency} recurring invoice for ${dateKey(periodStart)}`,
                    ...calculateInvoiceAmounts(installmentAmount, taxRate)
                };
                engagement.invoices.push(invoice);
                generated.push(invoice);
            }

            cycleIndex += months;
            periodStart = addAnchoredMonths(
                engagement.contractStartDate,
                cycleIndex
            );
        }
    }

    return generated;
};

const generateInvoices = async (customerId, engagementId, payload = {}) => {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    const engagement = customer.projectEngagements.id(engagementId);
    if (!engagement) throw new AppError('Project engagement not found', 404);

    const generated = generateDueInvoicesForEngagement(
        customer,
        engagement,
        payload
    );
    if (generated.length === 0) {
        throw new AppError(
            'No billing periods or milestones are due on the selected date',
            400
        );
    }

    customer.revenueSummary.outstandingAmount =
        Number(customer.revenueSummary.outstandingAmount || 0) +
        generated.reduce(
            (sum, invoice) => sum + Number(invoice.totalAmount || 0),
            0
        );

    await customer.save();
    return getCustomerById(customerId);
};

const generateAllDueInvoices = async (asOfDate = new Date()) => {
    const customers = await Customer.find({
        'projectEngagements.status': 'Active'
    });
    let generatedCount = 0;

    for (const customer of customers) {
        let customerChanged = false;
        for (const engagement of customer.projectEngagements || []) {
            if (engagement.status !== 'Active') continue;
            let generated;
            try {
                generated = generateDueInvoicesForEngagement(
                    customer,
                    engagement,
                    { asOfDate }
                );
            } catch (error) {
                if (error.statusCode === 400) continue;
                throw error;
            }
            if (generated.length === 0) continue;

            generatedCount += generated.length;
            customerChanged = true;
            customer.revenueSummary.outstandingAmount =
                Number(customer.revenueSummary.outstandingAmount || 0) +
                generated.reduce(
                    (sum, invoice) => sum + Number(invoice.totalAmount || 0),
                    0
                );
        }
        if (customerChanged) await customer.save();
    }

    return generatedCount;
};

const addPaymentRecord = async (customerId, engagementId, payload) => {
    const amount = Number(payload.amount || 0);
    if (amount <= 0) {
        throw new AppError('Payment amount must be greater than zero', 400);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    const engagement = customer.projectEngagements.id(engagementId);
    if (!engagement) throw new AppError('Project engagement not found', 404);

    let invoice = null;
    if (payload.invoiceNumber) {
        invoice = engagement.invoices.find(
            (item) => item.invoiceNumber === payload.invoiceNumber
        );
        if (!invoice) throw new AppError('Invoice not found', 404);

        const previouslyPaid = (engagement.payments || [])
            .filter(
                (payment) => payment.invoiceNumber === payload.invoiceNumber
            )
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const remainingAmount = Math.max(
            0,
            Number(invoice.totalAmount || 0) - previouslyPaid
        );
        if (amount > remainingAmount + 0.001) {
            throw new AppError(
                `Payment exceeds the remaining invoice balance of ${remainingAmount.toFixed(2)}`,
                400
            );
        }
    }

    engagement.payments.push({
        invoiceNumber: payload.invoiceNumber || '',
        paymentDate: payload.paymentDate || new Date(),
        amount,
        paymentMode: payload.paymentMode || 'Bank Transfer',
        referenceNumber: payload.referenceNumber || '',
        notes: payload.notes || ''
    });

    if (invoice) {
        const paidAmount = (engagement.payments || [])
            .filter(
                (payment) => payment.invoiceNumber === payload.invoiceNumber
            )
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        invoice.paidAmount = Math.min(
            paidAmount,
            Number(invoice.totalAmount || 0)
        );
        invoice.paymentStatus =
            invoice.paidAmount >= Number(invoice.totalAmount || 0) - 0.001
                ? 'Paid'
                : 'Partially Paid';

        if (
            invoice.paymentStatus === 'Paid' &&
            invoice.scheduleKey?.startsWith('milestone:')
        ) {
            const milestoneId = invoice.scheduleKey.split(':')[1];
            const milestone = engagement.milestones.id(milestoneId);
            if (milestone) {
                milestone.status = 'Paid';
                milestone.paidAt = payload.paymentDate || new Date();
            }
        }
    }

    customer.revenueSummary.totalRevenue =
        Number(customer.revenueSummary.totalRevenue || 0) + amount;
    customer.revenueSummary.outstandingAmount = Math.max(
        0,
        Number(customer.revenueSummary.outstandingAmount || 0) - amount
    );
    customer.revenueSummary.lastTransactionDate =
        payload.paymentDate || new Date();

    await customer.save();
    return getCustomerById(customerId);
};

const getInvoicePreview = async (customerId, engagementId, invoiceId) => {
    const customer = await Customer.findById(customerId)
        .populate('assignedTo', 'name email mobile department')
        .lean();
    if (!customer) throw new AppError('Customer not found', 404);

    const engagement = (customer.projectEngagements || []).find(
        (item) => String(item._id) === String(engagementId)
    );
    if (!engagement) throw new AppError('Project engagement not found', 404);

    const invoice = (engagement.invoices || []).find(
        (item) => String(item._id) === String(invoiceId)
    );
    if (!invoice) throw new AppError('Invoice not found', 404);

    return { customer, engagement, invoice };
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
    addOpportunity,
    addProjectEngagement,
    generateDueInvoicesForEngagement,
    generateInvoices,
    generateAllDueInvoices,
    addPaymentRecord,
    getInvoicePreview
};
