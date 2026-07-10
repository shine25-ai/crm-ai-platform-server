const Issue = require('./issue.model');
const Project = require('../projects/project.model');
const notificationService = require('../notifications/notification.service');
const AppError = require('../../shared/utils/appError');

const createIssue = async (data, userId) => {
    const issue = await Issue.create({
        ...data,
        reportedBy: userId,
        activityHistory: [
            {
                action: 'Issue Created',
                details: `Issue "${data.title}" reported.`,
                performedBy: userId
            }
        ]
    });

    // Notify assignee
    if (data.assignedTo) {
        await notificationService.createNotification(
            data.assignedTo,
            'New Issue Assigned',
            `You have been assigned issue: "${data.title}"`,
            'System Alert',
            {
                referenceId: issue._id,
                referenceType: 'System',
                actionUrl: `/issues`
            }
        );
    }

    // Log in Project Activity
    const project = await Project.findById(data.project);
    if (project) {
        project.activityHistory.push({
            action: 'Issue Logged',
            details: `Issue "${data.title}" was logged with priority ${data.priority}.`,
            performedBy: userId
        });
        await project.save();
    }

    return issue;
};

const getIssues = async (filters = {}) => {
    const query = {};
    if (filters.project) query.project = filters.project;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.reportedBy) query.reportedBy = filters.reportedBy;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' };
    }

    return Issue.find(query)
        .populate('project', 'projectName')
        .populate('assignedTo', 'name email')
        .populate('reportedBy', 'name email')
        .sort({ createdAt: -1 });
};

const getIssueById = async (id) => {
    const issue = await Issue.findById(id)
        .populate('project', 'projectName')
        .populate('task', 'title')
        .populate('customer', 'customerName')
        .populate('assignedTo', 'name email')
        .populate('reportedBy', 'name email')
        .populate('comments.createdBy', 'name');
    if (!issue) throw new AppError('Issue not found', 404);
    return issue;
};

const updateIssue = async (id, data, userId) => {
    const issue = await Issue.findById(id);
    if (!issue) throw new AppError('Issue not found', 404);

    const oldStatus = issue.status;
    const oldAssignee = issue.assignedTo ? String(issue.assignedTo) : null;

    Object.assign(issue, data);

    // Check if status changed
    if (data.status && data.status !== oldStatus) {
        issue.activityHistory.push({
            action: 'Status Updated',
            details: `Status updated from "${oldStatus}" to "${data.status}".`,
            performedBy: userId
        });
    }

    // Check if assignment changed
    const newAssignee = data.assignedTo ? String(data.assignedTo) : null;
    if (newAssignee && newAssignee !== oldAssignee) {
        issue.activityHistory.push({
            action: 'Assignee Changed',
            details: `Assigned resource updated.`,
            performedBy: userId
        });
        // Notify new assignee
        await notificationService.createNotification(
            data.assignedTo,
            'Issue Assigned',
            `You have been assigned issue: "${issue.title}"`,
            'System Alert',
            {
                referenceId: issue._id,
                referenceType: 'System',
                actionUrl: `/issues`
            }
        );
    }

    await issue.save();

    // Log Project Activity if project matches
    const project = await Project.findById(issue.project);
    if (project) {
        project.activityHistory.push({
            action: 'Issue Updated',
            details: `Issue "${issue.title}" details updated.`,
            performedBy: userId
        });
        await project.save();
    }

    return issue;
};

const addComment = async (id, commentStr, userId) => {
    const issue = await Issue.findById(id);
    if (!issue) throw new AppError('Issue not found', 404);

    issue.comments.push({
        comment: commentStr,
        createdBy: userId,
        createdAt: new Date()
    });

    issue.activityHistory.push({
        action: 'Comment Added',
        details: 'Added a discussion comment.',
        performedBy: userId
    });

    await issue.save();
    return issue;
};

const getIssueDashboard = async () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const openCount = await Issue.countDocuments({
        status: { $in: ['Open', 'In Progress', 'Reopened'] }
    });

    const criticalCount = await Issue.countDocuments({
        priority: 'Critical',
        status: { $in: ['Open', 'In Progress', 'Reopened'] }
    });

    const overdueCount = await Issue.countDocuments({
        status: { $in: ['Open', 'In Progress', 'Reopened'] },
        dueDate: { $lt: today }
    });

    const resolvedThisMonth = await Issue.countDocuments({
        status: { $in: ['Resolved', 'Closed'] },
        updatedAt: { $gte: startOfMonth }
    });

    return {
        openIssues: openCount,
        criticalIssues: criticalCount,
        overdueIssues: overdueCount,
        resolvedThisMonth
    };
};

const getIssueReports = async (filters = {}) => {
    const issues = await Issue.find()
        .populate('project', 'projectName')
        .populate('assignedTo', 'name');

    const projectIssues = {};
    const employeeIssues = {};
    const priorityIssues = {
        Low: 0,
        Medium: 0,
        High: 0,
        Critical: 0
    };

    issues.forEach((issue) => {
        const projName = issue.project?.projectName || 'General';
        const empName = issue.assignedTo?.name || 'Unassigned';

        projectIssues[projName] = (projectIssues[projName] || 0) + 1;
        employeeIssues[empName] = (employeeIssues[empName] || 0) + 1;

        if (priorityIssues[issue.priority] !== undefined) {
            priorityIssues[issue.priority]++;
        }
    });

    const formatObj = (obj, labelKey, valueKey) =>
        Object.keys(obj).map((key) => ({
            [labelKey]: key,
            [valueKey]: obj[key]
        }));

    return {
        projectIssues: formatObj(projectIssues, 'project', 'count'),
        employeeIssues: formatObj(employeeIssues, 'employee', 'count'),
        priorityIssues: formatObj(priorityIssues, 'priority', 'count')
    };
};

const escalateIssues = async (userId) => {
    const today = new Date();

    // Find critical overdue issues that aren't escalated yet
    const overdueIssues = await Issue.find({
        priority: 'Critical',
        status: { $in: ['Open', 'In Progress', 'Reopened'] },
        dueDate: { $lt: today },
        isEscalated: false
    });

    for (const issue of overdueIssues) {
        issue.isEscalated = true;
        issue.activityHistory.push({
            action: 'Issue Escalated',
            details: 'Overdue critical issue escalated to managers.',
            performedBy: userId
        });
        await issue.save();

        // Notify assignee if any
        if (issue.assignedTo) {
            await notificationService.createNotification(
                issue.assignedTo,
                'CRITICAL ESCALATION',
                `Overdue critical issue escalated: "${issue.title}"`,
                'System Alert',
                {
                    referenceId: issue._id,
                    referenceType: 'System',
                    actionUrl: `/issues`
                }
            );
        }
    }

    return { escalatedCount: overdueIssues.length };
};

module.exports = {
    createIssue,
    getIssues,
    getIssueById,
    updateIssue,
    addComment,
    getIssueDashboard,
    getIssueReports,
    escalateIssues
};
