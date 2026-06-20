const mongoose = require('mongoose');

const chatReactionSchema = new mongoose.Schema(
    {
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatMessage',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        reaction: {
            type: String,
            required: true,
            enum: ['👍', '❤️', '😂', '😮', '😢', '👏']
        }
    },
    { timestamps: true }
);

// Prevent duplicate reactions by same user on same message
chatReactionSchema.index(
    { messageId: 1, userId: 1, reaction: 1 },
    { unique: true }
);

module.exports = mongoose.model('ChatReaction', chatReactionSchema);
