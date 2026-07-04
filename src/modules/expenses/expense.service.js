const ExpenseClaim = require('./expenseClaim.model');
const ExpenseAttachment = require('./expenseAttachment.model');
const Employee = require('../employees/employee.model');
const ApprovalAttachment = require('../approvals/approvalAttachment.model');
const approvalService = require('../approvals/approval.service');
const AppError = require('../../shared/utils/appError');
const {
    uploadExpenseAttachmentToS3,
    deleteFileFromS3
} = require('../../shared/services/s3.service');
const {
    logActivity,
    logAudit
} = require('../../shared/services/audit.service');

const REVIEW_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR'];
const EDITABLE_FIELDS = [
    'expenseDate',
    'category',
    'merchant',
    'description',
    'businessPurpose',
    'projectReference',
    'amount',
    'currency'
];

const resolveEmployee = async (user) => {
    const conditions = [{ userId: user.userId }];
    if (user.employeeId) conditions.push({ _id: user.employeeId });
    const employee = await Employee.findOne({ $or: conditions });
    if (!employee) {
        throw new AppError(
            'A linked employee profile is required for expense claims',
            400
        );
    }
    return employee;
};

const generateClaimNumber = async () => {
    const year = new Date().getFullYear();
    const count = await ExpenseClaim.countDocuments({
        createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1)
        }
    });
    return `EXP-${year}-${String(count + 1).padStart(5, '0')}`;
};

const validatePayload = (payload) => {
    if (!payload.expenseDate)
        throw new AppError('Expense date is required', 400);
    if (!payload.category)
        throw new AppError('Expense category is required', 400);
    if (!String(payload.description || '').trim()) {
        throw new AppError('Expense description is required', 400);
    }
    if (!String(payload.businessPurpose || '').trim()) {
        throw new AppError('Business purpose is required', 400);
    }
    if (Number(payload.amount || 0) <= 0) {
        throw new AppError('Expense amount must be greater than zero', 400);
    }
    const expenseDate = new Date(payload.expenseDate);
    if (Number.isNaN(expenseDate.getTime())) {
        throw new AppError('Expense date is invalid', 400);
    }
    if (expenseDate > new Date()) {
        throw new AppError('Expense date cannot be in the future', 400);
    }
};

const normalizePayload = (payload) => ({
    expenseDate: new Date(payload.expenseDate),
    category: payload.category,
    merchant: String(payload.merchant || '').trim(),
    description: String(payload.description || '').trim(),
    businessPurpose: String(payload.businessPurpose || '').trim(),
    projectReference: String(payload.projectReference || '').trim(),
    amount: Number(payload.amount),
    currency: String(payload.currency || 'INR').toUpperCase()
});

const createClaim = async (payload, user) => {
    validatePayload(payload);
    const employee = await resolveEmployee(user);
    let claim;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            claim = await ExpenseClaim.create({
                claimNumber: await generateClaimNumber(),
                employeeId: employee._id,
                submittedBy: user.userId,
                ...normalizePayload(payload),
                status: 'Draft',
                statusHistory: [
                    {
                        status: 'Draft',
                        note: 'Expense claim created',
                        changedBy: user.userId
                    }
                ]
            });
            break;
        } catch (error) {
            if (error.code !== 11000 || attempt === 2) throw error;
        }
    }
    await logActivity(
        user.userId,
        'CREATE',
        'Expenses',
        `Created expense claim ${claim.claimNumber}`
    );
    return claim;
};

const assertOwner = (claim, employee) => {
    if (String(claim.employeeId) !== String(employee._id)) {
        throw new AppError('You cannot access another employee’s claim', 403);
    }
};

const updateClaim = async (id, payload, user) => {
    const employee = await resolveEmployee(user);
    const claim = await ExpenseClaim.findById(id);
    if (!claim) throw new AppError('Expense claim not found', 404);
    assertOwner(claim, employee);
    if (claim.status !== 'Draft') {
        throw new AppError('Only draft claims can be edited', 400);
    }

    const merged = { ...claim.toObject(), ...payload };
    validatePayload(merged);
    const oldData = claim.toObject();
    const normalized = normalizePayload(merged);
    EDITABLE_FIELDS.forEach((field) => {
        if (Object.hasOwn(payload, field)) claim[field] = normalized[field];
    });
    await claim.save();
    await logAudit(
        user.userId,
        'Expenses',
        'UPDATE',
        oldData,
        claim.toObject()
    );
    return claim;
};

const addAttachments = async (claimId, files, user) => {
    const claim = await ExpenseClaim.findById(claimId);
    if (!claim) throw new AppError('Expense claim not found', 404);
    const employee = await resolveEmployee(user);
    assertOwner(claim, employee);
    if (claim.status !== 'Draft') {
        throw new AppError(
            'Attachments can only be changed while the claim is in Draft',
            400
        );
    }
    if (!files?.length) throw new AppError('Select at least one receipt', 400);

    const existingCount = await ExpenseAttachment.countDocuments({
        expenseClaimId: claim._id
    });
    if (existingCount + files.length > 5) {
        throw new AppError(
            'A claim can contain a maximum of 5 attachments',
            400
        );
    }

    const uploaded = [];
    try {
        for (const file of files) {
            const fileUrl = await uploadExpenseAttachmentToS3(file, claim._id);
            uploaded.push({
                expenseClaimId: claim._id,
                fileName: file.originalname,
                fileUrl,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedBy: user.userId
            });
        }
        const attachments = await ExpenseAttachment.insertMany(uploaded);
        await logActivity(
            user.userId,
            'UPLOAD',
            'Expenses',
            `Uploaded ${attachments.length} receipt(s) for ${claim.claimNumber}`
        );
        return attachments;
    } catch (error) {
        await Promise.all(
            uploaded.map((item) => deleteFileFromS3(item.fileUrl))
        );
        throw error;
    }
};

const deleteAttachment = async (attachmentId, user) => {
    const attachment = await ExpenseAttachment.findById(attachmentId);
    if (!attachment) throw new AppError('Expense attachment not found', 404);
    const claim = await ExpenseClaim.findById(attachment.expenseClaimId);
    if (!claim) throw new AppError('Expense claim not found', 404);
    const employee = await resolveEmployee(user);
    assertOwner(claim, employee);
    if (claim.status !== 'Draft') {
        throw new AppError(
            'Attachments cannot be removed after submission',
            400
        );
    }
    await deleteFileFromS3(attachment.fileUrl);
    await attachment.deleteOne();
    await logActivity(
        user.userId,
        'DELETE_ATTACHMENT',
        'Expenses',
        `Deleted receipt ${attachment.fileName} from ${claim.claimNumber}`
    );
};

const submitClaim = async (id, user) => {
    const employee = await resolveEmployee(user);
    const claim = await ExpenseClaim.findById(id);
    if (!claim) throw new AppError('Expense claim not found', 404);
    assertOwner(claim, employee);
    if (claim.status !== 'Draft') {
        throw new AppError('Only draft claims can be submitted', 400);
    }
    const receiptCount = await ExpenseAttachment.countDocuments({
        expenseClaimId: claim._id
    });
    if (receiptCount === 0) {
        throw new AppError(
            'Upload at least one receipt before submitting the claim',
            400
        );
    }

    const approval = await approvalService.createApproval(
        {
            requestType: 'Expense Claim',
            title: `${claim.claimNumber} · ${claim.category}`,
            description: `${claim.description}\nBusiness purpose: ${claim.businessPurpose}`,
            priority: 'Medium',
            effectiveDate: claim.expenseDate,
            requestedAmount: claim.amount,
            requestData: {
                expenseClaimId: claim._id,
                claimNumber: claim.claimNumber,
                category: claim.category,
                merchant: claim.merchant,
                currency: claim.currency,
                projectReference: claim.projectReference,
                receiptCount
            }
        },
        user
    );

    const receipts = await ExpenseAttachment.find({
        expenseClaimId: claim._id
    }).lean();
    await ApprovalAttachment.insertMany(
        receipts.map((receipt) => ({
            approvalRequestId: approval.request._id,
            name: receipt.fileName,
            fileUrl: receipt.fileUrl,
            fileSize: receipt.fileSize,
            mimeType: receipt.mimeType,
            uploadedBy: user.userId
        }))
    );

    claim.approvalId = approval.request._id;
    claim.status = 'Submitted';
    claim.statusHistory.push({
        status: 'Submitted',
        note: `Submitted for approval as ${approval.request.requestNumber}`,
        changedBy: user.userId
    });
    await claim.save();
    return getClaimById(claim._id, user);
};

const buildClaimQuery = async (filters, user) => {
    const role = String(user.roleCode || '').toUpperCase();
    const query = {};
    if (filters.own || !REVIEW_ROLES.includes(role)) {
        const employee = await resolveEmployee(user);
        query.employeeId = employee._id;
    } else if (filters.employeeId) {
        query.employeeId = filters.employeeId;
    }
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.from || filters.to) {
        query.expenseDate = {};
        if (filters.from) query.expenseDate.$gte = new Date(filters.from);
        if (filters.to) query.expenseDate.$lte = new Date(filters.to);
    }
    return query;
};

const listClaims = async (filters = {}, user) => {
    const query = await buildClaimQuery(filters, user);
    const claims = await ExpenseClaim.find(query)
        .populate('employeeId', 'employeeId name email designation department')
        .populate('submittedBy', 'name email')
        .populate('reviewedBy', 'name email')
        .populate(
            'approvalId',
            'requestNumber status currentStageNumber currentApproverId stageApprovals'
        )
        .sort({ createdAt: -1 })
        .lean();
    const counts = await ExpenseAttachment.aggregate([
        {
            $match: {
                expenseClaimId: { $in: claims.map((claim) => claim._id) }
            }
        },
        { $group: { _id: '$expenseClaimId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(
        counts.map((item) => [String(item._id), item.count])
    );
    return claims.map((claim) => ({
        ...claim,
        attachmentCount: countMap.get(String(claim._id)) || 0
    }));
};

const getClaimById = async (id, user) => {
    const claim = await ExpenseClaim.findById(id)
        .populate('employeeId', 'employeeId name email designation department')
        .populate('submittedBy', 'name email')
        .populate('reviewedBy', 'name email')
        .populate({
            path: 'approvalId',
            populate: [
                { path: 'currentApproverId', select: 'name email' },
                { path: 'stageApprovals.approverId', select: 'name email' },
                { path: 'stageApprovals.actedBy', select: 'name email' }
            ]
        })
        .lean();
    if (!claim) throw new AppError('Expense claim not found', 404);
    const role = String(user.roleCode || '').toUpperCase();
    if (!REVIEW_ROLES.includes(role)) {
        const employee = await resolveEmployee(user);
        if (String(claim.employeeId._id) !== String(employee._id)) {
            throw new AppError(
                'You cannot access another employee’s claim',
                403
            );
        }
    }
    const attachments = await ExpenseAttachment.find({
        expenseClaimId: claim._id
    })
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: 1 })
        .lean();
    return { claim, attachments };
};

const reviewClaim = async (id, payload, user) => {
    const role = String(user.roleCode || '').toUpperCase();
    if (!REVIEW_ROLES.includes(role)) {
        throw new AppError('Only HR or administrators can review claims', 403);
    }
    if (!['Approve', 'Reject'].includes(payload.action)) {
        throw new AppError('Review action must be Approve or Reject', 400);
    }
    if (payload.action === 'Reject' && !String(payload.comments || '').trim()) {
        throw new AppError('A rejection reason is required', 400);
    }

    const claim = await ExpenseClaim.findById(id);
    if (!claim) throw new AppError('Expense claim not found', 404);
    if (!claim.approvalId) {
        throw new AppError('This claim has not been submitted', 400);
    }
    const approvedAmount = Number(payload.approvedAmount || claim.amount);
    if (
        payload.action === 'Approve' &&
        (approvedAmount <= 0 || approvedAmount > claim.amount)
    ) {
        throw new AppError(
            'Approved amount must be greater than zero and cannot exceed the claimed amount',
            400
        );
    }

    const details = await approvalService.updateApproval(
        claim.approvalId,
        {
            action: payload.action,
            comments:
                payload.comments ||
                `${payload.action}d during expense claim review`
        },
        user
    );

    const reviewedClaim = await ExpenseClaim.findById(id);
    reviewedClaim.reviewedBy = user.userId;
    reviewedClaim.reviewedAt = new Date();
    reviewedClaim.reviewNote = payload.comments || '';
    if (details.request.status === 'Approved') {
        reviewedClaim.approvedAmount = approvedAmount;
    }
    await reviewedClaim.save();
    await logActivity(
        user.userId,
        payload.action.toUpperCase(),
        'Expenses',
        `${payload.action}d expense claim ${reviewedClaim.claimNumber}`
    );
    return getClaimById(reviewedClaim._id, user);
};

const cancelClaim = async (id, user) => {
    const employee = await resolveEmployee(user);
    const claim = await ExpenseClaim.findById(id);
    if (!claim) throw new AppError('Expense claim not found', 404);
    assertOwner(claim, employee);
    if (!claim.approvalId) {
        claim.status = 'Cancelled';
        claim.statusHistory.push({
            status: 'Cancelled',
            note: 'Draft claim cancelled by employee',
            changedBy: user.userId
        });
        await claim.save();
    } else {
        await approvalService.updateApproval(
            claim.approvalId,
            { action: 'Cancel', comments: 'Cancelled by employee' },
            user
        );
    }
    return getClaimById(claim._id, user);
};

const syncClaimFromApproval = async (approval) => {
    if (approval.requestType !== 'Expense Claim') return;
    const claim = await ExpenseClaim.findOne({ approvalId: approval._id });
    if (!claim) return;

    let nextStatus = claim.status;
    if (approval.status === 'Approved') nextStatus = 'Approved';
    else if (approval.status === 'Rejected') nextStatus = 'Rejected';
    else if (approval.status === 'Cancelled') nextStatus = 'Cancelled';
    else if (
        approval.stageApprovals?.some((stage) => stage.status === 'Approved')
    ) {
        nextStatus = 'Under Review';
    } else {
        nextStatus = 'Submitted';
    }
    if (claim.status === nextStatus) return;

    const actedStage = [...(approval.stageApprovals || [])]
        .reverse()
        .find((stage) => stage.actedBy);
    claim.status = nextStatus;
    claim.statusHistory.push({
        status: nextStatus,
        note:
            actedStage?.comments ||
            `Synchronized from approval ${approval.requestNumber}`,
        changedBy: actedStage?.actedBy?._id || actedStage?.actedBy || null
    });
    await claim.save();
};

module.exports = {
    createClaim,
    updateClaim,
    addAttachments,
    deleteAttachment,
    submitClaim,
    listClaims,
    getClaimById,
    reviewClaim,
    cancelClaim,
    syncClaimFromApproval
};
