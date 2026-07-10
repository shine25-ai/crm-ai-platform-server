const projectService = require('./project.service');
const ApiResponse = require('../../shared/utils/response');

const createProject = async (req, res, next) => {
    try {
        const project = await projectService.createProject(
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Project created successfully',
            project,
            201
        );
    } catch (error) {
        next(error);
    }
};

const getProjects = async (req, res, next) => {
    try {
        const projects = await projectService.getProjects(req.query);
        return ApiResponse.success(
            res,
            'Projects retrieved successfully',
            projects
        );
    } catch (error) {
        next(error);
    }
};

const getProjectById = async (req, res, next) => {
    try {
        const project = await projectService.getProjectById(req.params.id);
        return ApiResponse.success(
            res,
            'Project retrieved successfully',
            project
        );
    } catch (error) {
        next(error);
    }
};

const updateProject = async (req, res, next) => {
    try {
        const project = await projectService.updateProject(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Project updated successfully',
            project
        );
    } catch (error) {
        next(error);
    }
};

const toggleArchive = async (req, res, next) => {
    try {
        const project = await projectService.toggleArchive(
            req.params.id,
            req.user.userId
        );
        const msg = project.isArchived
            ? 'Project archived successfully'
            : 'Project restored successfully';
        return ApiResponse.success(res, msg, project);
    } catch (error) {
        next(error);
    }
};

const addMilestone = async (req, res, next) => {
    try {
        const project = await projectService.addMilestone(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Milestone added successfully',
            project
        );
    } catch (error) {
        next(error);
    }
};

const updateMilestone = async (req, res, next) => {
    try {
        const project = await projectService.updateMilestone(
            req.params.id,
            req.params.milestoneId,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Milestone updated successfully',
            project
        );
    } catch (error) {
        next(error);
    }
};

const deleteMilestone = async (req, res, next) => {
    try {
        const project = await projectService.deleteMilestone(
            req.params.id,
            req.params.milestoneId,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Milestone deleted successfully',
            project
        );
    } catch (error) {
        next(error);
    }
};

const getProjectDashboard = async (req, res, next) => {
    try {
        const stats = await projectService.getDashboardStats(req.params.id);
        return ApiResponse.success(
            res,
            'Project dashboard statistics retrieved successfully',
            stats
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    toggleArchive,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    getProjectDashboard
};
