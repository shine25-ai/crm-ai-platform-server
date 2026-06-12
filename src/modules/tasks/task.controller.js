const taskService = require('./task.service');
const ApiResponse = require('../../shared/utils/response');

const getTasks = async (req, res, next) => {
    try {
        const tasks = await taskService.listTasks(req.user, req.query);
        return ApiResponse.success(res, 'Tasks retrieved successfully', tasks);
    } catch (error) {
        next(error);
    }
};

const createTask = async (req, res, next) => {
    try {
        const task = await taskService.createTask(req.body, req.user);
        return ApiResponse.success(res, 'Task created successfully', task, 201);
    } catch (error) {
        next(error);
    }
};

const updateTask = async (req, res, next) => {
    try {
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

module.exports = { getTasks, createTask, updateTask, deleteTask };
