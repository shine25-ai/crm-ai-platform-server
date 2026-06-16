const Task = require('./task.model');
const Role = require('../roles/role.model');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');
const { logActivity } = require('../../shared/services/audit.service');

const populateTask = (query) =>
    query
        .populate('assignedBy', 'name email')
        .populate('assignedTo', 'name email');

const canManageAllTasks = async (user) => {
    const role = await Role.findById(user.roleId);
    const permissions = role?.permissions || [];
    return (
        permissions.includes('*') ||
        ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(role?.roleCode)
    );
};

const assertTaskAccess = async (task, user) => {
    if (await canManageAllTasks(user)) return;
    const userId = String(user.userId);
    const ownsTask =
        String(task.assignedTo) === userId ||
        String(task.assignedBy) === userId;
    if (!ownsTask) throw new AppError('Forbidden', 403);
};

const listTasks = async (user, filters = {}) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    if (!(await canManageAllTasks(user))) {
        query.$or = [{ assignedTo: user.userId }, { assignedBy: user.userId }];
    }

    return populateTask(Task.find(query).sort({ createdAt: -1 }));
};

const createTask = async (data, user) => {
    const canAssignOthers = await canManageAllTasks(user);
    const task = await Task.create({
        title: data.title,
        description: data.description || '',
        assignedBy: user.userId,
        assignedTo: canAssignOthers ? data.assignedTo : user.userId,
        priority: data.priority || 'Medium',
        dueDate: data.dueDate,
        progress: data.progress || 0,
        status: data.status || 'Pending',
        attachments: data.attachments || []
    });

    await notificationService.createNotification(
        task.assignedTo,
        'Task Assigned',
        `"${data.title}" has been assigned to you.`,
        'Task Assigned',
        { referenceId: task._id, referenceType: 'Task', actionUrl: '/tasks' }
    );
    await logActivity(
        user.userId,
        'CREATE',
        'Tasks',
        `Created task ${task.title}`
    );

    return populateTask(Task.findById(task._id));
};

const updateTask = async (id, data, user) => {
    const task = await Task.findById(id);
    if (!task) throw new AppError('Task not found', 404);
    await assertTaskAccess(task, user);

    // Detect reassignment before mutating the task
    const previousAssignee = String(task.assignedTo);
    const newAssignee = data.assignedTo
        ? String(data.assignedTo)
        : previousAssignee;
    const isReassigned = newAssignee !== previousAssignee;

    const editable = [
        'title',
        'description',
        'assignedTo',
        'priority',
        'dueDate',
        'progress',
        'status',
        'attachments'
    ];

    editable.forEach((field) => {
        if (data[field] !== undefined) task[field] = data[field];
    });

    if (data.comment) {
        task.comments.push({ userId: user.userId, message: data.comment });
    }

    if (task.status === 'Completed') task.progress = 100;
    await task.save();

    // Notify new assignee on reassignment
    if (isReassigned) {
        await notificationService.createNotification(
            task.assignedTo,
            'Task Reassigned',
            `"${task.title}" has been reassigned to you.`,
            'Task Assigned',
            {
                referenceId: task._id,
                referenceType: 'Task',
                actionUrl: '/tasks'
            }
        );
    }

    // Notify assigner when task is completed
    if (task.status === 'Completed') {
        await notificationService.createNotification(
            task.assignedBy,
            'Task Completed',
            `"${task.title}" was marked as completed.`,
            'Task Completed',
            {
                referenceId: task._id,
                referenceType: 'Task',
                actionUrl: '/tasks'
            }
        );
    }

    await logActivity(
        user.userId,
        'UPDATE',
        'Tasks',
        `Updated task ${task.title}`
    );
    return populateTask(Task.findById(task._id));
};

const deleteTask = async (id, user) => {
    const task = await Task.findById(id);
    if (!task) throw new AppError('Task not found', 404);
    await assertTaskAccess(task, user);
    await Task.findByIdAndDelete(id);
    await logActivity(
        user.userId,
        'DELETE',
        'Tasks',
        `Deleted task ${task.title}`
    );
    return true;
};

module.exports = { listTasks, createTask, updateTask, deleteTask };
