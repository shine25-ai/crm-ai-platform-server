const Task = require('./task.model');
const TaskComment = require('./taskComment.model');
const TaskAttachment = require('./taskAttachment.model');
const TaskAssignmentHistory = require('./taskAssignmentHistory.model');
const TaskActivityLog = require('./taskActivityLog.model');
const Role = require('../roles/role.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');
const { logActivity } = require('../../shared/services/audit.service');
const fs = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    const assignedToId = String(task.assignedTo?._id || task.assignedTo);
    const assignedById = String(task.assignedBy?._id || task.assignedBy);
    const ownsTask = assignedToId === userId || assignedById === userId;
    if (!ownsTask) throw new AppError('Forbidden', 403);
};

const logTaskActivity = async (taskId, userId, action, details = '') => {
    try {
        await TaskActivityLog.create({ taskId, userId, action, details });
    } catch (err) {
        console.error('[TaskService] Activity log error:', err.message);
    }
};

// ─── Task CRUD ────────────────────────────────────────────────────────────────

const listTasks = async (user, filters = {}) => {
    const isManager = await canManageAllTasks(user);
    const query = { isDeleted: false };

    if (!isManager) {
        query.$or = [{ assignedTo: user.userId }, { assignedBy: user.userId }];
    } else {
        if (filters.assignedToMe) {
            query.assignedTo = user.userId;
        } else if (filters.assignedTo) {
            query.assignedTo = filters.assignedTo;
        }
    }

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;

    if (filters.search) {
        query.$or = [
            { title: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } }
        ];
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || 'createdAt';
    const sortDir = filters.sortDir === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDir };

    const [tasks, total] = await Promise.all([
        populateTask(Task.find(query).sort(sort).skip(skip).limit(limit)),
        Task.countDocuments(query)
    ]);

    return {
        tasks,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

const getTaskById = async (id, user) => {
    const task = await populateTask(
        Task.findOne({ _id: id, isDeleted: false })
    );
    if (!task) throw new AppError('Task not found', 404);
    await assertTaskAccess(task, user);

    // Fetch related data in parallel
    const [comments, attachments, history, activityLogs] = await Promise.all([
        TaskComment.find({ taskId: id, isDeleted: false })
            .populate('userId', 'name email')
            .sort({ createdAt: 1 }),
        TaskAttachment.find({ taskId: id, isDeleted: false })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 }),
        TaskAssignmentHistory.find({ taskId: id })
            .populate('previousAssignee', 'name email')
            .populate('newAssignee', 'name email')
            .populate('assignedBy', 'name email')
            .sort({ assignedAt: -1 }),
        TaskActivityLog.find({ taskId: id })
            .populate('userId', 'name')
            .sort({ createdAt: -1 })
            .limit(50)
    ]);

    // Post-process activity log details to replace raw User ObjectIds with names
    const processedActivityLogs = [];
    const hex24Regex = /\b[a-f\d]{24}\b/gi;
    const userIdsToFetch = new Set();

    for (const log of activityLogs) {
        const matches = log.details.match(hex24Regex);
        if (matches) {
            matches.forEach((id) => userIdsToFetch.add(id));
        }
    }

    const userMap = {};
    if (userIdsToFetch.size > 0) {
        const usersList = await User.find(
            { _id: { $in: Array.from(userIdsToFetch) } },
            'name'
        );
        for (const u of usersList) {
            userMap[String(u._id)] = u.name;
        }
    }

    for (const log of activityLogs) {
        let details = log.details;
        const matches = details.match(hex24Regex);
        if (matches) {
            for (const id of matches) {
                if (userMap[id]) {
                    details = details
                        .replace(`user ${id}`, userMap[id])
                        .replace(id, userMap[id]);
                }
            }
        }
        processedActivityLogs.push({
            ...log.toObject(),
            details
        });
    }

    return {
        task,
        comments,
        attachments,
        history,
        activityLogs: processedActivityLogs
    };
};

const createTask = async (data, user) => {
    const canAssignOthers = await canManageAllTasks(user);

    if (!data.title?.trim()) throw new AppError('Title is required', 400);
    if (!data.description?.trim())
        throw new AppError('Description is required', 400);
    if (!data.assignedTo) throw new AppError('Assignee is required', 400);

    // Validate due date not in past
    if (data.dueDate) {
        const due = new Date(data.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (due < today)
            throw new AppError('Due date cannot be in the past', 400);
    }

    const assignedTo = canAssignOthers ? data.assignedTo : user.userId;

    const task = await Task.create({
        title: data.title.trim(),
        description: data.description.trim(),
        assignedBy: user.userId,
        assignedTo,
        priority: data.priority || 'Medium',
        dueDate: data.dueDate || null,
        progress: 0,
        status: 'Open'
    });

    // Record initial assignment history
    await TaskAssignmentHistory.create({
        taskId: task._id,
        previousAssignee: null,
        newAssignee: assignedTo,
        assignedBy: user.userId
    });

    await logTaskActivity(
        task._id,
        user.userId,
        'CREATED',
        `Task "${task.title}" was created.`
    );

    const assigneeUser = await User.findById(assignedTo);
    const assigneeName = assigneeUser ? assigneeUser.name : 'Unknown User';

    await logTaskActivity(
        task._id,
        user.userId,
        'ASSIGNED',
        `Task assigned to ${assigneeName}.`
    );

    // Notify assignee (only if assigning to someone else)
    if (String(assignedTo) !== String(user.userId)) {
        await notificationService.createNotification(
            assignedTo,
            'Task Assigned',
            `"${task.title}" has been assigned to you.`,
            'Task Assigned',
            {
                referenceId: task._id,
                referenceType: 'Task',
                actionUrl: '/employee/dashboard?tab=tasks'
            }
        );
    }

    await logActivity(
        user.userId,
        'CREATE',
        'Tasks',
        `Created task "${task.title}"`
    );
    return populateTask(Task.findById(task._id));
};

const updateTask = async (id, data, user) => {
    const task = await Task.findOne({ _id: id, isDeleted: false });
    if (!task) throw new AppError('Task not found', 404);
    await assertTaskAccess(task, user);

    const previousAssignee = String(task.assignedTo);
    const newAssignee = data.assignedTo
        ? String(data.assignedTo)
        : previousAssignee;
    const isReassigned = newAssignee !== previousAssignee;

    const previousStatus = task.status;
    const previousPriority = task.priority;
    const previousProgress = task.progress;

    const editable = [
        'title',
        'description',
        'assignedTo',
        'priority',
        'dueDate',
        'progress',
        'status'
    ];
    editable.forEach((field) => {
        if (data[field] !== undefined) task[field] = data[field];
    });

    // Lock progress to 100 when completed
    if (task.status === 'Completed') task.progress = 100;

    await task.save();

    // Record activity logs for meaningful changes
    if (isReassigned) {
        await TaskAssignmentHistory.create({
            taskId: task._id,
            previousAssignee,
            newAssignee,
            assignedBy: user.userId
        });
        const assigneeUser = await User.findById(newAssignee);
        const assigneeName = assigneeUser ? assigneeUser.name : 'Unknown User';

        await logTaskActivity(
            task._id,
            user.userId,
            'REASSIGNED',
            `Task reassigned to ${assigneeName}.`
        );
        await notificationService.createNotification(
            task.assignedTo,
            'Task Reassigned',
            `"${task.title}" has been reassigned to you.`,
            'Task Assigned',
            {
                referenceId: task._id,
                referenceType: 'Task',
                actionUrl: '/employee/dashboard?tab=tasks'
            }
        );
    }

    if (data.status && data.status !== previousStatus) {
        await logTaskActivity(
            task._id,
            user.userId,
            'STATUS_UPDATED',
            `Status changed from "${previousStatus}" to "${task.status}".`
        );
    }

    if (data.priority && data.priority !== previousPriority) {
        await logTaskActivity(
            task._id,
            user.userId,
            'PRIORITY_UPDATED',
            `Priority changed from "${previousPriority}" to "${task.priority}".`
        );
    }

    if (
        data.progress !== undefined &&
        data.progress !== previousProgress &&
        !data.status
    ) {
        await logTaskActivity(
            task._id,
            user.userId,
            'PROGRESS_UPDATED',
            `Progress updated to ${task.progress}%.`
        );
    }

    // Notify assigner when task is completed
    if (task.status === 'Completed' && previousStatus !== 'Completed') {
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
        `Updated task "${task.title}"`
    );
    return populateTask(Task.findById(task._id));
};

const deleteTask = async (id, user) => {
    const task = await Task.findOne({ _id: id, isDeleted: false });
    if (!task) throw new AppError('Task not found', 404);
    await assertTaskAccess(task, user);

    // Soft delete
    task.isDeleted = true;
    task.deletedAt = new Date();
    task.deletedBy = user.userId;
    await task.save();

    await logTaskActivity(
        task._id,
        user.userId,
        'DELETED',
        `Task "${task.title}" was deleted.`
    );
    await logActivity(
        user.userId,
        'DELETE',
        'Tasks',
        `Deleted task "${task.title}"`
    );
    return true;
};

// ─── Employee Dashboard Summary ───────────────────────────────────────────────

const getEmployeeTaskSummary = async (userId) => {
    const now = new Date();
    const [total, open, inProgress, completed, overdue, upcoming] =
        await Promise.all([
            Task.countDocuments({ assignedTo: userId, isDeleted: false }),
            Task.countDocuments({
                assignedTo: userId,
                status: 'Open',
                isDeleted: false
            }),
            Task.countDocuments({
                assignedTo: userId,
                status: 'In Progress',
                isDeleted: false
            }),
            Task.countDocuments({
                assignedTo: userId,
                status: 'Completed',
                isDeleted: false
            }),
            Task.countDocuments({
                assignedTo: userId,
                status: { $nin: ['Completed', 'Cancelled'] },
                dueDate: { $lt: now },
                isDeleted: false
            }),
            Task.find({
                assignedTo: userId,
                status: { $nin: ['Completed', 'Cancelled'] },
                dueDate: { $gte: now },
                isDeleted: false
            })
                .sort({ dueDate: 1 })
                .limit(5)
                .populate('assignedBy', 'name')
        ]);

    return { total, open, inProgress, completed, overdue, upcoming };
};

// ─── Comment Operations ───────────────────────────────────────────────────────

const addComment = async (taskId, message, user) => {
    const task = await Task.findOne({ _id: taskId, isDeleted: false });
    if (!task) throw new AppError('Task not found', 404);
    await assertTaskAccess(task, user);

    if (!message?.trim()) throw new AppError('Comment cannot be empty', 400);

    const comment = await TaskComment.create({
        taskId,
        userId: user.userId,
        message: message.trim()
    });

    await logTaskActivity(
        taskId,
        user.userId,
        'COMMENT_ADDED',
        `Comment added: "${message.slice(0, 60)}${message.length > 60 ? '...' : ''}"`
    );

    return TaskComment.findById(comment._id).populate('userId', 'name email');
};

const editComment = async (commentId, message, user) => {
    const comment = await TaskComment.findOne({
        _id: commentId,
        isDeleted: false
    });
    if (!comment) throw new AppError('Comment not found', 404);

    const isOwner = String(comment.userId) === String(user.userId);
    const isManager = await canManageAllTasks(user);
    if (!isOwner && !isManager) throw new AppError('Forbidden', 403);

    if (!message?.trim()) throw new AppError('Comment cannot be empty', 400);

    comment.message = message.trim();
    await comment.save();

    await logTaskActivity(
        comment.taskId,
        user.userId,
        'COMMENT_EDITED',
        `Comment edited.`
    );

    return TaskComment.findById(comment._id).populate('userId', 'name email');
};

const deleteComment = async (commentId, user) => {
    const comment = await TaskComment.findOne({
        _id: commentId,
        isDeleted: false
    });
    if (!comment) throw new AppError('Comment not found', 404);

    const isOwner = String(comment.userId) === String(user.userId);
    const isManager = await canManageAllTasks(user);
    if (!isOwner && !isManager) throw new AppError('Forbidden', 403);

    comment.isDeleted = true;
    await comment.save();

    await logTaskActivity(
        comment.taskId,
        user.userId,
        'COMMENT_DELETED',
        `Comment deleted.`
    );
    return true;
};

// ─── Attachment Operations ────────────────────────────────────────────────────

const addAttachment = async (taskId, file, user) => {
    const task = await Task.findOne({ _id: taskId, isDeleted: false });
    if (!task) throw new AppError('Task not found', 404);
    await assertTaskAccess(task, user);

    const {
        uploadTaskAttachmentToS3
    } = require('../../shared/services/s3.service');
    const s3Url = await uploadTaskAttachmentToS3(file, user.userId);

    const attachment = await TaskAttachment.create({
        taskId,
        uploadedBy: user.userId,
        name: file.originalname,
        filePath: s3Url,
        mimeType: file.mimetype,
        fileSize: file.size
    });

    await logTaskActivity(
        taskId,
        user.userId,
        'ATTACHMENT_ADDED',
        `File "${file.originalname}" uploaded.`
    );

    return TaskAttachment.findById(attachment._id).populate(
        'uploadedBy',
        'name email'
    );
};

const deleteAttachment = async (attachmentId, user) => {
    const attachment = await TaskAttachment.findOne({
        _id: attachmentId,
        isDeleted: false
    });
    if (!attachment) throw new AppError('Attachment not found', 404);

    const task = await Task.findById(attachment.taskId);
    if (task) await assertTaskAccess(task, user);

    const { deleteFileFromS3 } = require('../../shared/services/s3.service');

    // Remove physical file / S3 file
    if (attachment.filePath.startsWith('http')) {
        await deleteFileFromS3(attachment.filePath);
    } else {
        const absPath = path.join(
            __dirname,
            '../../../',
            attachment.filePath.replace(/^\//, '')
        );
        if (fs.existsSync(absPath)) {
            fs.unlinkSync(absPath);
        }
    }

    attachment.isDeleted = true;
    await attachment.save();

    await logTaskActivity(
        attachment.taskId,
        user.userId,
        'ATTACHMENT_DELETED',
        `File "${attachment.name}" deleted.`
    );
    return true;
};

module.exports = {
    listTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    getEmployeeTaskSummary,
    addComment,
    editComment,
    deleteComment,
    addAttachment,
    deleteAttachment
};
// Trigger restart
