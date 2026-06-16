const MessageModel = require('./chat.model');
const User = require('../users/user.model');
const mongoose = require('mongoose');
const ApiResponse = require('../../shared/utils/response');

/**
 * Return a list of all active users (excluding self) for use as chat contacts.
 * Accessible to any authenticated user (employees included).
 */
const getContacts = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const contacts = await User.find(
            { _id: { $ne: userId }, status: { $in: ['Active', 'ACTIVE'] } },
            'name email department lastActive'
        ).lean();
        return ApiResponse.success(
            res,
            'Chat contacts retrieved successfully',
            contacts
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Fetch conversational message logs between the logged-in user and a peer user
 */
const getMessages = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { otherUserId } = req.params;

        const messages = await MessageModel.find({
            $or: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId }
            ]
        }).sort({ createdAt: 1 }); // Oldest first to match conversation thread order

        return ApiResponse.success(
            res,
            'Conversational messages retrieved successfully',
            messages
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all unread messages from a specific sender to the current user as read
 */
const markRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { senderId } = req.params;

        const result = await MessageModel.updateMany(
            { senderId, receiverId: userId, isRead: false },
            { $set: { isRead: true } }
        );

        return ApiResponse.success(
            res,
            'Messages marked as read successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Get summaries (unread counts & last message previews) for all chat threads of the current user
 */
const getChatSummary = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // 1. Aggregate unread message counts grouped by senderId
        const unreadCounts = await MessageModel.aggregate([
            { $match: { receiverId: userObjectId, isRead: false } },
            { $group: { _id: '$senderId', count: { $sum: 1 } } }
        ]);

        const unreadMap = {};
        unreadCounts.forEach((item) => {
            unreadMap[item._id.toString()] = item.count;
        });

        // 2. Fetch the absolute last message exchanged with each unique user contact
        const lastMessages = await MessageModel.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: userObjectId },
                        { receiverId: userObjectId }
                    ]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $gt: ['$senderId', '$receiverId'] },
                            { sender: '$senderId', receiver: '$receiverId' },
                            { sender: '$receiverId', receiver: '$senderId' }
                        ]
                    },
                    lastMsg: { $first: '$$ROOT' }
                }
            }
        ]);

        const lastMsgsMap = {};
        lastMessages.forEach((item) => {
            const peerId =
                item.lastMsg.senderId.toString() === userId
                    ? item.lastMsg.receiverId.toString()
                    : item.lastMsg.senderId.toString();
            lastMsgsMap[peerId] = {
                messageText: item.lastMsg.messageText,
                createdAt: item.lastMsg.createdAt
            };
        });

        return ApiResponse.success(
            res,
            'Chat summaries retrieved successfully',
            {
                unreadCounts: unreadMap,
                lastMessages: lastMsgsMap
            }
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getContacts,
    getMessages,
    markRead,
    getChatSummary
};
