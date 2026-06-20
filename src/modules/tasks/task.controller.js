const taskService = require('./task.service');
const { validateCreateTask, validateUpdateTask } = require('./task.validation');
const ApiResponse = require('../../shared/utils/response');

// ─── Task CRUD ────────────────────────────────────────────────────────────────

const getTasks = async (req, res, next) => {
    try {
        const result = await taskService.listTasks(req.user, req.query);
        return ApiResponse.success(res, 'Tasks retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};

const getTask = async (req, res, next) => {
    try {
        const result = await taskService.getTaskById(req.params.id, req.user);
        return ApiResponse.success(res, 'Task retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};

const createTask = async (req, res, next) => {
    try {
        validateCreateTask(req.body);
        const task = await taskService.createTask(req.body, req.user);
        return ApiResponse.success(res, 'Task created successfully', task, 201);
    } catch (error) {
        next(error);
    }
};

const updateTask = async (req, res, next) => {
    try {
        validateUpdateTask(req.body);
        const task = await taskService.updateTask(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(res, 'Task updated successfully', task);
    } catch (error) {
        next(error);
    }
};

const deleteTask = async (req, res, next) => {
    try {
        await taskService.deleteTask(req.params.id, req.user);
        return ApiResponse.success(res, 'Task deleted successfully');
    } catch (error) {
        next(error);
    }
};

// ─── Employee Endpoints ───────────────────────────────────────────────────────

const getMyTasks = async (req, res, next) => {
    try {
        const result = await taskService.listTasks(req.user, {
            ...req.query,
            assignedToMe: true
        });
        return ApiResponse.success(
            res,
            'Employee tasks retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const getEmployeeTaskSummary = async (req, res, next) => {
    try {
        const summary = await taskService.getEmployeeTaskSummary(
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Task summary retrieved successfully',
            summary
        );
    } catch (error) {
        next(error);
    }
};

// ─── Comments ─────────────────────────────────────────────────────────────────

const addComment = async (req, res, next) => {
    try {
        const comment = await taskService.addComment(
            req.params.id,
            req.body.message,
            req.user
        );
        return ApiResponse.success(res, 'Comment added', comment, 201);
    } catch (error) {
        next(error);
    }
};

const editComment = async (req, res, next) => {
    try {
        const comment = await taskService.editComment(
            req.params.commentId,
            req.body.message,
            req.user
        );
        return ApiResponse.success(res, 'Comment updated', comment);
    } catch (error) {
        next(error);
    }
};

const deleteComment = async (req, res, next) => {
    try {
        await taskService.deleteComment(req.params.commentId, req.user);
        return ApiResponse.success(res, 'Comment deleted');
    } catch (error) {
        next(error);
    }
};

// ─── Attachments ──────────────────────────────────────────────────────────────

const addAttachment = async (req, res, next) => {
    try {
        if (!req.file) throw new Error('No file uploaded');
        const attachment = await taskService.addAttachment(
            req.params.id,
            req.file,
            req.user
        );
        return ApiResponse.success(res, 'Attachment uploaded', attachment, 201);
    } catch (error) {
        next(error);
    }
};

const deleteAttachment = async (req, res, next) => {
    try {
        await taskService.deleteAttachment(req.params.attachmentId, req.user);
        return ApiResponse.success(res, 'Attachment deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    getMyTasks,
    getEmployeeTaskSummary,
    addComment,
    editComment,
    deleteComment,
    addAttachment,
    deleteAttachment
};
