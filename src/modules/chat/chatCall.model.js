const mongoose = require('mongoose');

const chatCallSchema = new mongoose.Schema(
    {
        callerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatConversation',
            default: null,
            index: true
        },
        callType: {
            type: String,
            enum: ['Voice', 'Video'],
            default: 'Voice'
        },
        status: {
            type: String,
            enum: [
                'Ringing',
                'Answered',
                'Declined',
                'Missed',
                'Ended',
                'Cancelled'
            ],
            default: 'Ringing',
            index: true
        },
        startedAt: { type: Date, default: Date.now },
        answeredAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
        durationSeconds: { type: Number, default: 0 }
    },
    { timestamps: true }
);

chatCallSchema.index({ callerId: 1, receiverId: 1, startedAt: -1 });

module.exports = mongoose.model('ChatCall', chatCallSchema);
