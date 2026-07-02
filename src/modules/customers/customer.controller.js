const customerService = require('./customer.service');
const ApiResponse = require('../../shared/utils/response');

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
          })
        : '-';

const formatMoney = (value) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(Number(value || 0));

const renderInvoicePreview = ({ customer, engagement, invoice }) => {
    const template = invoice.templateId || {};
    const primaryColor = /^#[0-9a-f]{6}$/i.test(template.primaryColor || '')
        ? template.primaryColor
        : '#4F46E5';
    const address = customer.billingAddress || {};
    const billingAddress = [
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.postalCode,
        address.country
    ]
        .filter(Boolean)
        .map(escapeHtml)
        .join('<br />');
    const templateContext = {
        customername: customer.customerName,
        companyname: customer.companyName,
        invoicenumber: invoice.invoiceNumber,
        projectname: engagement.projectName,
        milestonename: invoice.milestoneName || '',
        invoicedate: formatDate(invoice.invoiceDate),
        duedate: formatDate(invoice.dueDate),
        totalamount: formatMoney(invoice.totalAmount)
    };
    const templateText = (value, fallback) =>
        escapeHtml(
            String(value || fallback).replace(
                /{{\s*([^}]+)\s*}}/g,
                (match, key) =>
                    templateContext[
                        String(key)
                            .trim()
                            .toLowerCase()
                            .replace(/[._\s-]/g, '')
                    ] ?? match
            )
        );

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(invoice.invoiceNumber)} Invoice</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: #0f172a; font-family: Inter, Arial, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; background: rgba(255,255,255,.92); border-bottom: 1px solid #e2e8f0; }
    button { border: 0; border-radius: 8px; padding: 10px 14px; background: #4f46e5; color: #fff; font-weight: 800; cursor: pointer; }
    .invoice { width: min(920px, calc(100vw - 28px)); margin: 24px auto; background: #fff; border: 1px solid #dbe4f0; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 70px rgba(15,23,42,.12); }
    .hero { display: grid; grid-template-columns: 1.4fr .8fr; gap: 20px; padding: 34px; background: linear-gradient(135deg, #111827, ${primaryColor}); color: #fff; }
    .brand { font-size: 28px; font-weight: 900; letter-spacing: .2px; }
    .muted { color: #64748b; }
    .hero .muted { color: #c7d2fe; }
    .number { text-align: right; }
    .number strong { display: block; font-size: 22px; margin-top: 6px; }
    .section { padding: 28px 34px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
    .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; }
    h1, h2, h3, p { margin: 0; }
    h3 { margin-bottom: 10px; font-size: 13px; text-transform: uppercase; color: #475569; letter-spacing: .08em; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { padding: 14px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; }
    td:last-child, th:last-child { text-align: right; }
    .totals { display: grid; justify-content: end; margin-top: 18px; }
    .totals div { display: grid; grid-template-columns: 180px 160px; gap: 16px; padding: 8px 0; }
    .total { font-size: 20px; font-weight: 900; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 12px !important; }
    .status { display: inline-flex; border-radius: 999px; padding: 6px 10px; background: #fff7ed; color: #c2410c; font-weight: 900; }
    .footer { padding: 20px 34px 30px; color: #64748b; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .invoice { width: 100%; margin: 0; border: 0; border-radius: 0; box-shadow: none; }
    }
    @media (max-width: 720px) {
      .hero, .grid { grid-template-columns: 1fr; }
      .number { text-align: left; }
      .section, .hero, .footer { padding: 22px; }
      .totals div { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <main class="invoice">
    <section class="hero">
      <div>
        <p class="brand">${templateText(template.title, 'CRM AI Platform')}</p>
        <p class="muted">${templateText(template.subtitle, 'Project billing invoice')}</p>
      </div>
      <div class="number">
        <p class="muted">Invoice Number</p>
        <strong>${escapeHtml(invoice.invoiceNumber)}</strong>
        <p class="status">${escapeHtml(invoice.paymentStatus)}</p>
      </div>
    </section>
    <section class="section">
      <div class="grid">
        <div class="box">
          <h3>Bill To</h3>
          <p><strong>${escapeHtml(customer.customerName)}</strong></p>
          <p>${escapeHtml(customer.companyName || '')}</p>
          <p>${escapeHtml(customer.email || '')}</p>
          <p>${escapeHtml(customer.mobileNumber || '')}</p>
          <p>${billingAddress || '-'}</p>
        </div>
        <div class="box">
          <h3>Invoice Details</h3>
          <p><strong>Project:</strong> ${escapeHtml(engagement.projectName)}</p>
          <p><strong>Billing:</strong> ${escapeHtml(invoice.billingFrequency || engagement.billingFrequency)}</p>
          <p><strong>Milestone:</strong> ${escapeHtml(invoice.milestoneName || '-')}</p>
          <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
          <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Taxable Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(invoice.notes || engagement.projectName)}</td>
            <td>${formatMoney(invoice.taxableAmount || invoice.amount)}</td>
          </tr>
        </tbody>
      </table>
      <div class="totals">
        <div><span class="muted">Sub Total</span><strong>${formatMoney(invoice.amount)}</strong></div>
        <div><span class="muted">${escapeHtml(invoice.taxDetails?.label || 'Tax')} (${Number(invoice.taxDetails?.rate || 0)}%)</span><strong>${formatMoney(invoice.taxDetails?.amount)}</strong></div>
        <div class="total"><span>Total Amount</span><span>${formatMoney(invoice.totalAmount)}</span></div>
      </div>
    </section>
    <section class="footer">
      <p>Payment Terms: ${escapeHtml(engagement.paymentTerms || '-')}</p>
      <p>${templateText(template.footerText, 'This invoice is generated from the customer project engagement record.')}</p>
    </section>
  </main>
</body>
</html>`;
};

const listCustomers = async (req, res, next) => {
    try {
        const customers = await customerService.listCustomers(req.query);
        return ApiResponse.success(
            res,
            'Customers retrieved successfully',
            customers
        );
    } catch (error) {
        next(error);
    }
};

const getCustomer = async (req, res, next) => {
    try {
        const customer = await customerService.getCustomerById(req.params.id);
        return ApiResponse.success(
            res,
            'Customer retrieved successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const customer = await customerService.createCustomer(req.body);
        return ApiResponse.success(
            res,
            'Customer created successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        const customer = await customerService.updateCustomer(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Customer updated successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const deleteCustomer = async (req, res, next) => {
    try {
        const result = await customerService.deleteCustomer(req.params.id);
        return ApiResponse.success(
            res,
            'Customer deleted successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const addContact = async (req, res, next) => {
    try {
        const customer = await customerService.addContact(
            req.params.id,
            req.body
        );
        return ApiResponse.success(res, 'Contact added successfully', customer);
    } catch (error) {
        next(error);
    }
};

const updateContact = async (req, res, next) => {
    try {
        const customer = await customerService.updateContact(
            req.params.id,
            req.params.contactId,
            req.body
        );
        return ApiResponse.success(
            res,
            'Contact updated successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const deleteContact = async (req, res, next) => {
    try {
        const customer = await customerService.deleteContact(
            req.params.id,
            req.params.contactId
        );
        return ApiResponse.success(
            res,
            'Contact deleted successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const uploadDocument = async (req, res, next) => {
    try {
        const customer = await customerService.uploadDocument(
            req.params.id,
            req.file,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Document uploaded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const deleteDocument = async (req, res, next) => {
    try {
        const customer = await customerService.deleteDocument(
            req.params.id,
            req.params.documentId
        );
        return ApiResponse.success(
            res,
            'Document deleted successfully',
            customer
        );
    } catch (error) {
        next(error);
    }
};

const addFollowUp = async (req, res, next) => {
    try {
        const customer = await customerService.addFollowUp(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Follow-up recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addMeeting = async (req, res, next) => {
    try {
        const customer = await customerService.addMeeting(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Meeting recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addTransaction = async (req, res, next) => {
    try {
        const customer = await customerService.addTransaction(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Transaction recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addOpportunity = async (req, res, next) => {
    try {
        const customer = await customerService.addOpportunity(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Opportunity recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addProjectEngagement = async (req, res, next) => {
    try {
        const customer = await customerService.addProjectEngagement(
            req.params.id,
            req.body
        );
        return ApiResponse.success(
            res,
            'Project engagement created successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const generateInvoices = async (req, res, next) => {
    try {
        const customer = await customerService.generateInvoices(
            req.params.id,
            req.params.engagementId,
            req.body
        );
        return ApiResponse.success(
            res,
            'Invoices generated successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addPaymentRecord = async (req, res, next) => {
    try {
        const customer = await customerService.addPaymentRecord(
            req.params.id,
            req.params.engagementId,
            req.body
        );
        return ApiResponse.success(
            res,
            'Payment recorded successfully',
            customer,
            201
        );
    } catch (error) {
        next(error);
    }
};

const viewInvoice = async (req, res, next) => {
    try {
        const invoicePreview = await customerService.getInvoicePreview(
            req.params.id,
            req.params.engagementId,
            req.params.invoiceId
        );
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${invoicePreview.invoice.invoiceNumber}.html"`
        );
        return res.send(renderInvoicePreview(invoicePreview));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listCustomers,
    getCustomer,
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
    generateInvoices,
    addPaymentRecord,
    viewInvoice
};
