const mongoose = require('mongoose');

const chatParticipantSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatConversation',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ChatParticipant', chatParticipantSchema);
