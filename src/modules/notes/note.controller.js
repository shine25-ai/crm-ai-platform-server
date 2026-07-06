const noteService = require('./note.service');
const ApiResponse = require('../../shared/utils/response');

const getNotes = async (req, res, next) => {
    try {
        const notes = await noteService.getUserNotes(req.user.userId);
        return ApiResponse.success(res, 'Notes retrieved successfully', notes);
    } catch (error) {
        next(error);
    }
};

const createNote = async (req, res, next) => {
    try {
        const note = await noteService.createNote(req.body, req.user.userId);
        return ApiResponse.success(res, 'Note created successfully', note, 201);
    } catch (error) {
        next(error);
    }
};

const updateNote = async (req, res, next) => {
    try {
        const note = await noteService.updateNote(
            req.params.id,
            req.body,
            req.user.userId
        );
        return ApiResponse.success(res, 'Note updated successfully', note);
    } catch (error) {
        next(error);
    }
};

const deleteNote = async (req, res, next) => {
    try {
        await noteService.deleteNote(req.params.id, req.user.userId);
        return ApiResponse.success(res, 'Note deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotes,
    createNote,
    updateNote,
    deleteNote
};
