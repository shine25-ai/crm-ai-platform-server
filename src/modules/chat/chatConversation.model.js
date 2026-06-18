const mongoose = require('mongoose');

const chatConversationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['direct', 'group'],
            default: 'direct'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
