const Note = require('./note.model');
const AppError = require('../../shared/utils/appError');

const getUserNotes = async (userId) => {
    return Note.find({ userId }).sort({ pinned: -1, updatedAt: -1 });
};

const createNote = async (data, userId) => {
    return Note.create({
        title: data.title,
        content: data.content,
        color: data.color || '#FFFFFF',
        pinned: data.pinned || false,
        userId: userId
    });
};

const updateNote = async (id, data, userId) => {
    const note = await Note.findById(id);
    if (!note) {
        throw new AppError('Note not found', 404);
    }
    if (note.userId.toString() !== userId.toString()) {
        throw new AppError('Unauthorized access to this note', 403);
    }

    ['title', 'content', 'color', 'pinned'].forEach((field) => {
        if (data[field] !== undefined) {
            note[field] = data[field];
        }
    });

    await note.save();
    return note;
};

const deleteNote = async (id, userId) => {
    const note = await Note.findById(id);
    if (!note) {
        throw new AppError('Note not found', 404);
    }
    if (note.userId.toString() !== userId.toString()) {
        throw new AppError('Unauthorized access to this note', 403);
    }

    await Note.findByIdAndDelete(id);
    return true;
};

module.exports = {
    getUserNotes,
    createNote,
    updateNote,
    deleteNote
};
