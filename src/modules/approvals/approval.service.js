const Approval = require('./approval.model');
const User = require('../users/user.model');
const Employee = require('../employees/employee.model');
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

    // Notify all HR / Admin / Super Admin users
    const approvers = await User.find({
        status: { $in: ['Active', 'ACTIVE'] }
    }).populate('roleId');
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
                    'Approval Request',
                    `${data.requestType} is waiting for your review.`,
                    'Approval Request',
                    {
                        referenceId: approval._id,
                        referenceType: 'Approval',
                        actionUrl: '/approvals'
                    }
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

    // Notify the requesting employee when a decision is made
    if (['Approved', 'Rejected'].includes(data.status)) {
        try {
            const emp = await Employee.findById(approval.employeeId);
            if (emp?.userId) {
                await notificationService.createNotification(
                    emp.userId,
                    `Approval ${data.status}`,
                    `Your ${approval.requestType} has been ${data.status.toLowerCase()}.`,
                    'Approval Request',
                    {
                        referenceId: approval._id,
                        referenceType: 'Approval',
                        actionUrl: '/approvals'
                    }
                );
            }
        } catch (notifyErr) {
            console.error(
                '[Approval Service] Failed to notify employee:',
                notifyErr.message
            );
        }
    }

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
