const express = require('express');
const router = express.Router();
const taskController = require('./task.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const { taskUpload } = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

// ─── Employee-specific routes (before /:id to avoid conflicts) ────────────────
router.get(
    '/employee/my-tasks',
    authorize('tasks:read'),
    taskController.getMyTasks
);
router.get(
    '/employee/dashboard-summary',
    authorize('tasks:read'),
    taskController.getEmployeeTaskSummary
);

// ─── Task CRUD ────────────────────────────────────────────────────────────────
router.get('/', authorize('tasks:read'), taskController.getTasks);
router.post('/', authorize('tasks:write'), taskController.createTask);
router.get('/:id', authorize('tasks:read'), taskController.getTask);
router.put(
    '/:id',
    authorize('tasks:write', 'tasks:read'),
    taskController.updateTask
);
router.delete(
    '/:id',
    authorize('tasks:delete', 'tasks:write'),
    taskController.deleteTask
);

// ─── Comments ─────────────────────────────────────────────────────────────────
router.post(
    '/:id/comments',
    authorize('tasks:read'),
    taskController.addComment
);
router.put(
    '/comments/:commentId',
    authorize('tasks:read'),
    taskController.editComment
);
router.delete(
    '/comments/:commentId',
    authorize('tasks:read'),
    taskController.deleteComment
);

// ─── Attachments ──────────────────────────────────────────────────────────────
router.post(
    '/:id/attachments',
    authorize('tasks:write', 'tasks:read'),
    taskUpload.single('file'),
    taskController.addAttachment
);
router.delete(
    '/attachments/:attachmentId',
    authorize('tasks:write', 'tasks:read'),
    taskController.deleteAttachment
);

module.exports = router;
