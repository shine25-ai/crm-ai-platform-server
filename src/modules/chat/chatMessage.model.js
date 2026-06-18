const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatConversation',
            required: true,
            index: true
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            default: ''
        },
        messageType: {
            type: String,
            enum: ['text', 'file', 'image'],
            default: 'text'
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
