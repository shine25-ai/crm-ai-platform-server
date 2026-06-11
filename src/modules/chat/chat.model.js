const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        messageText: {
            type: String,
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Indexes for fast querying of conversational threads and unread messages
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);
