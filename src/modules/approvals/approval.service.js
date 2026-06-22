const Approval = require('./approval.model');
const Workflow = require('./workflow.model');
const ApprovalAction = require('./approvalAction.model');
const ApprovalComment = require('./approvalComment.model');
const ApprovalAttachment = require('./approvalAttachment.model');
const User = require('../users/user.model');
const Employee = require('../employees/employee.model');
const Role = require('../roles/role.model');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');
const {
    logActivity,
    logAudit
} = require('../../shared/services/audit.service');
const {
    validateCreateApproval,
    validateApprovalAction
} = require('./approval.validation');

// Fallback search to find a HR user if manager/deptHead is not found or has no userId
const findFallbackHRUser = async () => {
    try {
        const hrRole = await Role.findOne({ roleCode: 'HR' });
        if (hrRole) {
            const hrUser = await User.findOne({
                roleId: hrRole._id,
                status: 'Active'
            });
            if (hrUser) return hrUser;
        }
        const adminRole = await Role.findOne({
            roleCode: { $in: ['ADMIN', 'SUPER_ADMIN'] }
        });
        if (adminRole) {
            const adminUser = await User.findOne({
                roleId: adminRole._id,
                status: 'Active'
            });
            if (adminUser) return adminUser;
        }
    } catch (err) {
        console.error(
            '[Approval Engine] Fallback user search failed:',
            err.message
        );
    }
    return null;
};

// Calculate the approver user ID for a stage config given the requester employee profile
const findApproverForStage = async (stage, requesterEmployeeId) => {
    if (stage.approverRole === 'SPECIFIC_USER') {
        return stage.specificApproverId;
    }

    const requester =
        await Employee.findById(requesterEmployeeId).populate('department');
    if (!requester) {
        throw new AppError('Requester employee record not found', 404);
    }

    if (stage.approverRole === 'MANAGER') {
        if (!requester.manager) {
            const fallback = await findFallbackHRUser();
            return fallback ? fallback._id : null;
        }
        const managerEmp = await Employee.findById(requester.manager);
        if (!managerEmp || !managerEmp.userId) {
            const fallback = await findFallbackHRUser();
            return fallback ? fallback._id : null;
        }
        return managerEmp.userId;
    }

    if (stage.approverRole === 'DEPARTMENT_HEAD') {
        if (!requester.department || !requester.department.departmentHead) {
            // Fallback to manager or HR
            if (requester.manager) {
                const managerEmp = await Employee.findById(requester.manager);
                if (managerEmp && managerEmp.userId) return managerEmp.userId;
            }
            const fallback = await findFallbackHRUser();
            return fallback ? fallback._id : null;
        }
        const headEmp = await Employee.findById(
            requester.department.departmentHead
        );
        if (!headEmp || !headEmp.userId) {
            const fallback = await findFallbackHRUser();
            return fallback ? fallback._id : null;
        }
        return headEmp.userId;
    }

    if (stage.approverRole === 'HR') {
        const hrRole = await Role.findOne({ roleCode: 'HR' });
        if (hrRole) {
            const hrUser = await User.findOne({
                roleId: hrRole._id,
                status: 'Active'
            });
            if (hrUser) return hrUser._id;
        }
    }

    if (stage.approverRole === 'ADMIN') {
        const adminRole = await Role.findOne({
            roleCode: { $in: ['ADMIN', 'SUPER_ADMIN'] }
        });
        if (adminRole) {
            const adminUser = await User.findOne({
                roleId: adminRole._id,
                status: 'Active'
            });
            if (adminUser) return adminUser._id;
        }
    }

    const fallback = await findFallbackHRUser();
    return fallback ? fallback._id : null;
};

// Generate unique sequential request numbers REQ-YYYY-0001
const generateRequestNumber = async () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const count = await Approval.countDocuments({
        createdAt: { $gte: startOfYear, $lte: endOfYear }
    });

    return `REQ-${currentYear}-${String(count + 1).padStart(4, '0')}`;
};

const listApprovals = async (filters = {}, currentUser = {}) => {
    const query = {};

    // 1. Enforce security constraints
    if (
        filters.isSubmittedByMe === 'true' ||
        filters.isSubmittedByMe === true
    ) {
        // Filter strictly by current user's employeeId for "My Submissions" tab
        query.employeeId = currentUser.employeeId;
    } else if (currentUser.roleCode === 'EMPLOYEE') {
        // Employees can only see their own requests
        query.employeeId = currentUser.employeeId;
    } else if (
        filters.isReviewerQueue === 'true' ||
        filters.isReviewerQueue === true
    ) {
        // Manager / HR Reviewer queue: items pending current user review
        query.currentApproverId = currentUser.userId;
        query.status = { $in: ['Pending Approval', 'Escalated'] };
    } else if (currentUser.roleCode === 'MANAGER') {
        // Managers can view own requests or requests submitted by their reporting team members
        const teamEmployees = await Employee.find({
            manager: currentUser.employeeId
        }).select('_id');
        const teamEmployeeIds = teamEmployees.map((e) => e._id);
        query.$or = [
            { employeeId: currentUser.employeeId },
            { employeeId: { $in: teamEmployeeIds } }
        ];
    }
    // HR and ADMIN can view all requests, so no restriction on query keys unless filtered by isSubmittedByMe

    // 2. Map standard search query
    if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        query.$or = query.$or || [];
        query.$or.push(
            { requestNumber: searchRegex },
            { title: searchRegex },
            { description: searchRegex }
        );
    }

    // 3. Map general filters
    if (filters.status) query.status = filters.status;
    if (filters.requestType) query.requestType = filters.requestType;
    if (filters.priority) query.priority = filters.priority;
    if (filters.employeeId) query.employeeId = filters.employeeId;

    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
            query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [approvals, total] = await Promise.all([
        Approval.find(query)
            .populate({
                path: 'employeeId',
                select: 'name employeeId email designation department',
                populate: { path: 'department', select: 'departmentName' }
            })
            .populate('currentApproverId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Approval.countDocuments(query)
    ]);

    return {
        approvals,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

const getApprovalById = async (id, currentUser = {}) => {
    const approval = await Approval.findById(id)
        .populate({
            path: 'employeeId',
            select: 'name employeeId email designation department manager',
            populate: [
                { path: 'department', select: 'departmentName departmentHead' },
                { path: 'manager', select: 'name email userId' }
            ]
        })
        .populate('currentApproverId', 'name email')
        .populate('workflowId');

    if (!approval) {
        throw new AppError('Approval request not found', 404);
    }

    // Security check: Employees can only view their own
    if (
        currentUser.roleCode === 'EMPLOYEE' &&
        String(approval.employeeId._id) !== String(currentUser.employeeId)
    ) {
        throw new AppError('Forbidden: Access is denied.', 403);
    }

    // Managers check: Can view their own, requests reporting to them, or if they are the current active approver
    if (currentUser.roleCode === 'MANAGER') {
        const isOwn =
            String(approval.employeeId._id) === String(currentUser.employeeId);
        const isManagerOfRequester =
            approval.employeeId.manager &&
            String(approval.employeeId.manager._id) ===
                String(currentUser.employeeId);
        const isCurrentApprover =
            approval.currentApproverId &&
            String(approval.currentApproverId._id) ===
                String(currentUser.userId);

        if (!isOwn && !isManagerOfRequester && !isCurrentApprover) {
            throw new AppError('Forbidden: Access is denied.', 403);
        }
    }

    // Fetch related logs, comments, and attachments
    const [history, comments, attachments] = await Promise.all([
        ApprovalAction.find({ approvalRequestId: id })
            .populate('approverId', 'name email')
            .sort({ actionDate: 1 }),
        ApprovalComment.find({ approvalRequestId: id })
            .populate('userId', 'name email')
            .sort({ createdAt: 1 }),
        ApprovalAttachment.find({ approvalRequestId: id }).populate(
            'uploadedBy',
            'name email'
        )
    ]);

    return {
        request: approval,
        stages: approval.workflowId ? approval.workflowId.stages : [],
        history,
        comments,
        attachments
    };
};

const createApproval = async (data, user) => {
    // 1. Validate payload fields
    validateCreateApproval(data);

    // 2. Fetch the active workflow configurator routing configuration
    const workflow = await Workflow.findOne({
        requestType: data.requestType,
        isActive: true
    });
    if (!workflow) {
        throw new AppError(
            `No active approval workflow configured for this request type: ${data.requestType}`,
            400
        );
    }

    // 3. Resolve requester employee record
    const emp = await Employee.findOne({ userId: user.userId });
    if (!emp) {
        throw new AppError(
            'Only registered employees can submit approval requests',
            400
        );
    }

    // 4. Generate unique sequential ID
    const requestNumber = await generateRequestNumber();

    // 5. Evaluate first stage assignee
    if (workflow.stages.length === 0) {
        throw new AppError(
            'Workflow config has no approval stages defined.',
            500
        );
    }
    const initialStage = workflow.stages[0];
    const initialApprover = await findApproverForStage(initialStage, emp._id);

    // 6. Create request document
    const approval = await Approval.create({
        requestNumber,
        requestType: data.requestType,
        title: data.title,
        description: data.description,
        employeeId: emp._id,
        workflowId: workflow._id,
        currentStageNumber: initialStage.stageNumber,
        status: 'Pending Approval',
        priority: data.priority || 'Medium',
        effectiveDate: new Date(data.effectiveDate),
        requestedAmount: data.requestedAmount || 0,
        requestData: data.requestData || {},
        currentApproverId: initialApprover
    });

    // 7. Save transition step action
    await ApprovalAction.create({
        approvalRequestId: approval._id,
        stageNumber: 0, // 0 indicates request submission stage
        approverId: user.userId,
        action: 'Approve',
        comments: 'Request submitted for review'
    });

    // 8. Trigger in-app notifications
    if (initialApprover) {
        await notificationService.createNotification(
            initialApprover,
            'Approval Request',
            `${emp.name} has submitted a ${data.requestType} (${requestNumber}) waiting for your review.`,
            'Approval Request',
            {
                referenceId: approval._id,
                referenceType: 'Approval',
                actionUrl: '/approvals'
            }
        );
    }

    // 9. Write logs
    await logActivity(
        user.userId,
        'CREATE',
        'Approvals',
        `Submitted ${data.requestType} request: ${requestNumber}`
    );

    return getApprovalById(approval._id, {
        userId: user.userId,
        employeeId: emp._id,
        roleCode: user.roleCode
    });
};

const updateApproval = async (id, data, user) => {
    // 1. Validate action parameters
    validateApprovalAction(data);

    // 2. Fetch the request details
    const approval = await Approval.findById(id).populate('workflowId');
    if (!approval) {
        throw new AppError('Approval request not found', 404);
    }

    const emp = await Employee.findById(approval.employeeId);
    if (!emp) {
        throw new AppError('Requester employee record missing', 400);
    }

    // 3. Status boundary check
    if (['Approved', 'Rejected', 'Cancelled'].includes(approval.status)) {
        throw new AppError(
            `Approval request has already been finalized as: ${approval.status}`,
            400
        );
    }

    const isRequester = String(emp.userId) === String(user.userId);
    const isCurrentApprover =
        approval.currentApproverId &&
        String(approval.currentApproverId) === String(user.userId);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode);

    // 4. Evaluate specific actions
    if (data.action === 'Cancel') {
        if (!isRequester) {
            throw new AppError(
                'Forbidden: Only the request creator can cancel this request.',
                403
            );
        }
        approval.status = 'Cancelled';
        approval.currentApproverId = null;

        await approval.save();

        await ApprovalAction.create({
            approvalRequestId: approval._id,
            stageNumber: approval.currentStageNumber,
            approverId: user.userId,
            action: 'Cancel',
            comments: data.comments || 'Cancelled by employee'
        });

        await logActivity(
            user.userId,
            'UPDATE',
            'Approvals',
            `Cancelled request ${approval.requestNumber}`
        );
        return getApprovalById(approval._id, user);
    }

    let isAuthorized = isCurrentApprover || isAdmin;

    // Check if the current workflow stage role allows the user's roleCode to action it
    if (!isAuthorized && approval.workflowId) {
        const currentStage = approval.workflowId.stages?.find(
            (s) => s.stageNumber === approval.currentStageNumber
        );
        if (currentStage) {
            if (currentStage.approverRole === 'HR' && user.roleCode === 'HR') {
                isAuthorized = true;
            }
            if (
                currentStage.approverRole === 'ADMIN' &&
                ['ADMIN', 'SUPER_ADMIN'].includes(user.roleCode)
            ) {
                isAuthorized = true;
            }
        }
    }

    // For reviewer actions (Approve, Reject, Escalate, Reassign)
    if (!isAuthorized) {
        throw new AppError(
            'Forbidden: You are not authorized to make decisions on this stage.',
            403
        );
    }

    const oldState = JSON.stringify(approval);

    if (data.action === 'Reject') {
        approval.status = 'Rejected';
        approval.currentApproverId = null;

        await approval.save();

        await ApprovalAction.create({
            approvalRequestId: approval._id,
            stageNumber: approval.currentStageNumber,
            approverId: user.userId,
            action: 'Reject',
            comments: data.comments
        });

        // Notify requester employee
        if (emp.userId) {
            await notificationService.createNotification(
                emp.userId,
                'Approval Rejected',
                `Your ${approval.requestType} (${approval.requestNumber}) has been rejected. Reason: ${data.comments}`,
                'Approval Request',
                {
                    referenceId: approval._id,
                    referenceType: 'Approval',
                    actionUrl: '/approvals'
                }
            );
        }

        await logAudit(
            user.userId,
            'Approvals',
            'REJECT',
            JSON.parse(oldState),
            approval
        );
        return getApprovalById(approval._id, user);
    }

    if (data.action === 'Reassign') {
        const targetUser = await User.findById(data.targetApproverId);
        if (!targetUser) {
            throw new AppError('Target approver user not found', 400);
        }

        const oldApproverId = approval.currentApproverId;
        approval.currentApproverId = targetUser._id;
        await approval.save();

        await ApprovalAction.create({
            approvalRequestId: approval._id,
            stageNumber: approval.currentStageNumber,
            approverId: user.userId,
            action: 'Reassign',
            comments:
                data.comments ||
                `Reassigned from ${oldApproverId} to ${targetUser.name}`
        });

        // Notify new approver
        await notificationService.createNotification(
            targetUser._id,
            'Approval Request Reassigned',
            `You have been assigned to review ${approval.requestType} (${approval.requestNumber}).`,
            'Approval Request',
            {
                referenceId: approval._id,
                referenceType: 'Approval',
                actionUrl: '/approvals'
            }
        );

        await logActivity(
            user.userId,
            'UPDATE',
            'Approvals',
            `Reassigned request ${approval.requestNumber} to ${targetUser.name}`
        );
        return getApprovalById(approval._id, user);
    }

    if (data.action === 'Escalate') {
        approval.status = 'Escalated';

        // Find next-level supervisor
        let newApproverId = null;
        if (emp.manager) {
            const managerEmp = await Employee.findById(emp.manager);
            if (managerEmp && managerEmp.manager) {
                const upperManagerEmp = await Employee.findById(
                    managerEmp.manager
                );
                if (upperManagerEmp && upperManagerEmp.userId) {
                    newApproverId = upperManagerEmp.userId;
                }
            }
        }

        if (!newApproverId) {
            const hrUser = await findFallbackHRUser();
            newApproverId = hrUser ? hrUser._id : null;
        }

        approval.currentApproverId = newApproverId;
        approval.escalatedAt = new Date();
        await approval.save();

        await ApprovalAction.create({
            approvalRequestId: approval._id,
            stageNumber: approval.currentStageNumber,
            approverId: user.userId,
            action: 'Escalate',
            comments: data.comments || 'Request escalated to senior manager'
        });

        if (newApproverId) {
            await notificationService.createNotification(
                newApproverId,
                'Escalated Approval Request',
                `Urgent: Request ${approval.requestNumber} has been escalated to you for review.`,
                'Approval Request',
                {
                    referenceId: approval._id,
                    referenceType: 'Approval',
                    actionUrl: '/approvals'
                }
            );
        }

        await logActivity(
            user.userId,
            'UPDATE',
            'Approvals',
            `Escalated request ${approval.requestNumber}`
        );
        return getApprovalById(approval._id, user);
    }

    if (data.action === 'Approve') {
        const workflow = approval.workflowId;
        const currentStageIdx = workflow.stages.findIndex(
            (s) => s.stageNumber === approval.currentStageNumber
        );

        await ApprovalAction.create({
            approvalRequestId: approval._id,
            stageNumber: approval.currentStageNumber,
            approverId: user.userId,
            action: 'Approve',
            comments: data.comments || 'Approved'
        });

        const nextStage = workflow.stages[currentStageIdx + 1];

        if (nextStage) {
            // Move to next stage
            approval.currentStageNumber = nextStage.stageNumber;
            const nextApprover = await findApproverForStage(
                nextStage,
                approval.employeeId
            );
            approval.currentApproverId = nextApprover;
            approval.status = 'Pending Approval'; // make sure status is clean

            await approval.save();

            if (nextApprover) {
                await notificationService.createNotification(
                    nextApprover,
                    'Approval Request',
                    `New stage review needed for ${approval.requestType} (${approval.requestNumber}).`,
                    'Approval Request',
                    {
                        referenceId: approval._id,
                        referenceType: 'Approval',
                        actionUrl: '/approvals'
                    }
                );
            }
        } else {
            // Final stage approved
            approval.status = 'Approved';
            approval.currentApproverId = null;

            await approval.save();

            // Notify requester employee
            if (emp.userId) {
                await notificationService.createNotification(
                    emp.userId,
                    'Approval Request Approved',
                    `Congratulations! Your ${approval.requestType} (${approval.requestNumber}) has been approved.`,
                    'Approval Request',
                    {
                        referenceId: approval._id,
                        referenceType: 'Approval',
                        actionUrl: '/approvals'
                    }
                );
            }
        }

        await logAudit(
            user.userId,
            'Approvals',
            'APPROVE',
            JSON.parse(oldState),
            approval
        );
        return getApprovalById(approval._id, user);
    }

    throw new AppError('Unsupported action', 400);
};

const addComment = async (requestId, userId, commentText) => {
    if (!commentText || !commentText.trim()) {
        throw new AppError('Comment text cannot be empty', 400);
    }
    const comment = await ApprovalComment.create({
        approvalRequestId: requestId,
        userId,
        commentText
    });
    return ApprovalComment.findById(comment._id).populate(
        'userId',
        'name email'
    );
};

const addAttachment = async (requestId, fileData, userId) => {
    const attachment = await ApprovalAttachment.create({
        approvalRequestId: requestId,
        name: fileData.originalname || fileData.name,
        fileUrl: fileData.path || fileData.fileUrl,
        fileSize: fileData.size,
        mimeType: fileData.mimetype || fileData.mimeType,
        uploadedBy: userId
    });
    return ApprovalAttachment.findById(attachment._id).populate(
        'uploadedBy',
        'name email'
    );
};

const deleteAttachment = async (attachmentId, userId) => {
    const attachment = await ApprovalAttachment.findById(attachmentId);
    if (!attachment) {
        throw new AppError('Attachment not found', 404);
    }
    // Only allow deletion if user uploaded it
    if (String(attachment.uploadedBy) !== String(userId)) {
        throw new AppError(
            'Forbidden: Only the file uploader can delete it',
            403
        );
    }
    await attachment.deleteOne();
    return true;
};

// SLA timeout escalation check run by cron/scheduler
const runSlaEscalations = async () => {
    try {
        const pendingApprovals = await Approval.find({
            status: 'Pending Approval',
            currentApproverId: { $ne: null }
        }).populate('workflowId');

        let escalatedCount = 0;

        for (const req of pendingApprovals) {
            const workflow = req.workflowId;
            if (!workflow) continue;

            const stage = workflow.stages.find(
                (s) => s.stageNumber === req.currentStageNumber
            );
            const slaDays = stage && stage.slaDays ? stage.slaDays : 3;

            const now = new Date();
            const lastUpdated = new Date(req.updatedAt);
            const diffTime = Math.abs(now - lastUpdated);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= slaDays) {
                // Auto Escalate
                await updateApproval(
                    req._id,
                    {
                        action: 'Escalate',
                        comments: `Auto-escalated by system cron. Approver breached the SLA of ${slaDays} days.`
                    },
                    {
                        userId: req.currentApproverId, // escalate on behalf of current approver
                        roleCode: 'ADMIN' // bypass restrictions
                    }
                );
                escalatedCount++;
            }
        }
        console.log(
            `[Approval SLA Scheduler] Completed check. Escalated ${escalatedCount} requests.`
        );
    } catch (err) {
        console.error(
            '[Approval SLA Scheduler] Error in cron execution:',
            err.message
        );
    }
};

module.exports = {
    listApprovals,
    getApprovalById,
    createApproval,
    updateApproval,
    addComment,
    addAttachment,
    deleteAttachment,
    runSlaEscalations
};
