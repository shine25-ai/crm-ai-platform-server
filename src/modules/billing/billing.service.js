const Invoice = require('./invoice.model');
const Project = require('../projects/project.model');
const Customer = require('../customers/customer.model');
const Timesheet = require('../timesheets/timesheet.model');
const AppError = require('../../shared/utils/appError');

const createInvoice = async (data, userId) => {
    const {
        project: projectId,
        customer: customerId,
        amount,
        taxRate = 18,
        timesheetIds
    } = data;

    // Validate Project & Customer
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found', 404);

    const customer = await Customer.findById(customerId);
    if (!customer) throw new AppError('Customer not found', 404);

    // Compute Tax & Totals
    const taxAmt = Math.round((amount * taxRate) / 100);
    const totalAmt = amount + taxAmt;

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice = await Invoice.create({
        ...data,
        invoiceNumber,
        taxAmount: taxAmt,
        totalAmount: totalAmt,
        createdBy: userId
    });

    // If generated from timesheets, link timesheets to this invoice
    if (timesheetIds && timesheetIds.length > 0) {
        await Timesheet.updateMany(
            { _id: { $in: timesheetIds } },
            { $set: { isBilled: true, invoiceId: invoice._id } }
        );
    }

    // Log Activity in Project
    project.activityHistory.push({
        action: 'Invoice Generated',
        details: `Invoice ${invoiceNumber} created for amount ${totalAmt} (${data.billingType}).`,
        performedBy: userId
    });
    await project.save();

    return invoice;
};

const getInvoices = async (filters = {}) => {
    const query = {};
    if (filters.project) query.project = filters.project;
    if (filters.customer) query.customer = filters.customer;
    if (filters.status) query.status = filters.status;
    if (filters.billingType) query.billingType = filters.billingType;

    return Invoice.find(query)
        .populate('project', 'projectName')
        .populate('customer', 'customerName companyName')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
};

const getInvoiceById = async (id) => {
    const invoice = await Invoice.findById(id)
        .populate('project', 'projectName budget')
        .populate('customer', 'customerName companyName billingAddress website')
        .populate('createdBy', 'name');
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
};

const recordPayment = async (id, paymentData, userId) => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const amount = Number(paymentData.amount);
    if (isNaN(amount) || amount <= 0)
        throw new AppError('Invalid payment amount', 400);

    // Record in history
    invoice.paymentHistory.push({
        paymentDate: paymentData.paymentDate || new Date(),
        amount,
        paymentMode: paymentData.paymentMode || 'Bank Transfer',
        referenceNumber: paymentData.referenceNumber || '',
        notes: paymentData.notes || ''
    });

    invoice.paidAmount += amount;

    // Update status
    if (invoice.paidAmount >= invoice.totalAmount) {
        invoice.status = 'Paid';
    } else if (invoice.paidAmount > 0) {
        invoice.status = 'Partially paid';
    }

    await invoice.save();

    // Log Project Activity
    const project = await Project.findById(invoice.project);
    if (project) {
        project.activityHistory.push({
            action: 'Payment Recorded',
            details: `Received payment of ${amount} for Invoice ${invoice.invoiceNumber}.`,
            performedBy: userId
        });
        await project.save();
    }

    return invoice;
};

const updateInvoiceStatus = async (id, status, userId) => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const oldStatus = invoice.status;
    invoice.status = status;
    await invoice.save();

    // Log Project Activity
    const project = await Project.findById(invoice.project);
    if (project) {
        project.activityHistory.push({
            action: 'Invoice Updated',
            details: `Invoice ${invoice.invoiceNumber} status updated from "${oldStatus}" to "${status}".`,
            performedBy: userId
        });
        await project.save();
    }

    return invoice;
};

const getBillingDashboard = async () => {
    const invoices = await Invoice.find().populate('project', 'projectName');

    // 1. Core aggregates
    const totalInvoiced = invoices.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
    );

    // RevenueCollected (Sum of paymentHistory amounts)
    let totalCollected = 0;
    const paymentList = [];

    invoices.forEach((inv) => {
        inv.paymentHistory.forEach((pay) => {
            totalCollected += pay.amount;
            paymentList.push({
                projectName: inv.project?.projectName || 'General',
                paymentDate: pay.paymentDate,
                amount: pay.amount,
                paymentMode: pay.paymentMode,
                referenceNumber: pay.referenceNumber
            });
        });
    });

    const outstandingAmount = totalInvoiced - totalCollected;

    // 2. Status counts
    const statusCounts = {
        Generated: 0,
        Sent: 0,
        Paid: 0,
        'Partially paid': 0,
        Overdue: 0,
        Cancelled: 0
    };
    invoices.forEach((inv) => {
        if (statusCounts[inv.status] !== undefined) {
            statusCounts[inv.status]++;
        }
    });

    // 3. Monthly revenue collected trend (only from recorded payments)
    const revenueTrend = {};
    paymentList.forEach((pay) => {
        const d = new Date(pay.paymentDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // e.g. "2026-06"
        revenueTrend[key] = (revenueTrend[key] || 0) + pay.amount;
    });

    const formattedTrend = Object.keys(revenueTrend)
        .sort()
        .map((key) => ({
            month: key,
            revenue: revenueTrend[key]
        }));

    return {
        totalInvoiced,
        totalCollected,
        outstandingAmount,
        statusCounts,
        revenueTrend: formattedTrend,
        recentPayments: paymentList
            .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
            .slice(0, 10)
    };
};

const emailInvoice = async (id, userId) => {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw new AppError('Invoice not found', 404);

    if (invoice.status === 'Generated') {
        invoice.status = 'Sent';
        await invoice.save();
    }

    if (invoice.project) {
        const project = await Project.findById(invoice.project);
        if (project) {
            project.activityHistory.push({
                action: 'Invoice Emailed',
                details: `Invoice ${invoice.invoiceNumber} has been successfully sent to client email.`,
                performedBy: userId
            });
            await project.save();
        }
    }

    return invoice;
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    recordPayment,
    updateInvoiceStatus,
    getBillingDashboard,
    emailInvoice
};
