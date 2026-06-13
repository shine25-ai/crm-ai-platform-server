const Approval = require('./approval.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');
const { logActivity } = require('../../shared/services/audit.service');

const listApprovals = async (filters = {}) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.requestType) query.requestType = filters.requestType;
    return Approval.find(query)
        .populate('employeeId', 'name employeeId email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 });
};

const createApproval = async (data, user) => {
    const approval = await Approval.create({
        employeeId: data.employeeId,
        requestType: data.requestType,
        requestData: data.requestData || {}
    });

    const approvers = await User.find({ status: 'Active' }).populate('roleId');
    await Promise.all(
        approvers
            .filter((approver) =>
                ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(
                    approver.roleId?.roleCode
                )
            )
            .map((approver) =>
                notificationService.createNotification(
                    approver._id,
                    'Approval request',
                    `${data.requestType} is waiting for review.`,
                    'Approval Request'
                )
            )
    );

    await logActivity(
        user.userId,
        'CREATE',
        'Approvals',
        `Created ${data.requestType} approval request`
    );

    return Approval.findById(approval._id).populate(
        'employeeId',
        'name employeeId email'
    );
};

const updateApproval = async (id, data, user) => {
    const approval = await Approval.findById(id);
    if (!approval) throw new AppError('Approval request not found', 404);

    if (data.status) approval.status = data.status;
    if (data.decisionNote !== undefined)
        approval.decisionNote = data.decisionNote;
    if (['Approved', 'Rejected'].includes(approval.status)) {
        approval.approvedBy = user.userId;
    }

    await approval.save();
    await logActivity(
        user.userId,
        'UPDATE',
        'Approvals',
        `${approval.requestType} marked ${approval.status}`
    );

    return Approval.findById(approval._id)
        .populate('employeeId', 'name employeeId email')
        .populate('approvedBy', 'name email');
};

module.exports = { listApprovals, createApproval, updateApproval };
