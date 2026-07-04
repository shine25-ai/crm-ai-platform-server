const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
    {
        title: { type: String, default: '', trim: true },
        content: { type: String, default: '', trim: true },
        color: { type: String, default: '#FFFFFF' },
        pinned: { type: Boolean, default: false },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
