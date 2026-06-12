const express = require('express');
const router = express.Router();
const taskController = require('./task.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('tasks:read'), taskController.getTasks);
router.post('/', authorize('tasks:write'), taskController.createTask);
router.put(
    '/:id',
    authorize('tasks:write', 'tasks:read'),
    taskController.updateTask
);
router.delete('/:id', authorize('tasks:delete'), taskController.deleteTask);

module.exports = router;
