const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatConversation',
            required: true,
            index: true
        },
        groupName: {
            type: String,
            required: true,
            trim: true
        },
        groupImage: {
            type: String,
            default: null
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ChatGroup', chatGroupSchema);
