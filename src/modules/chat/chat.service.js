const mongoose = require('mongoose');
const ChatConversation = require('./chatConversation.model');
const ChatParticipant = require('./chatParticipant.model');
const ChatMessage = require('./chatMessage.model');
const ChatMessageRead = require('./chatMessageRead.model');
const ChatAttachment = require('./chatAttachment.model');
const ChatReaction = require('./chatReaction.model');
const ChatGroup = require('./chatGroup.model');
const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');

/**
 * Get summaries (unread counts & last message previews) for all chat threads of the current user
 */
const getChatSummary = async (userId) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const participations = await ChatParticipant.find({ userId: userObjectId });
    const conversationIds = participations.map((p) => p.conversationId);

    const summaries = [];

    for (const conversationId of conversationIds) {
        const conversation = await ChatConversation.findById(conversationId);
        if (!conversation) continue;

        // Last message details
        const lastMsg = await ChatMessage.findOne({ conversationId })
            .sort({ createdAt: -1 })
            .populate('senderId', 'name email');

        // Unread messages: messages in conversation where sender is not current user,
        // and current user has no read receipt in ChatMessageRead
        const readMessageIds = await ChatMessageRead.find({
            userId: userObjectId
        }).distinct('messageId');
        const unreadCount = await ChatMessage.countDocuments({
            conversationId,
            senderId: { $ne: userObjectId },
            _id: { $nin: readMessageIds }
        });

        let peer = null;
        let group = null;

        if (conversation.type === 'group') {
            group = await ChatGroup.findOne({ conversationId }).populate(
                'createdBy',
                'name email'
            );
        } else {
            const otherParticipant = await ChatParticipant.findOne({
                conversationId,
                userId: { $ne: userObjectId }
            }).populate(
                'userId',
                'name email department profilePhoto lastActive status'
            );
            peer = otherParticipant?.userId || null;
        }

        summaries.push({
            conversationId,
            type: conversation.type,
            peer,
            group,
            lastMessage: lastMsg
                ? {
                      _id: lastMsg._id,
                      message: lastMsg.message,
                      messageType: lastMsg.messageType,
                      sender: lastMsg.senderId,
                      createdAt: lastMsg.createdAt
                  }
                : null,
            unreadCount
        });
    }

    // Sort most recent first
    summaries.sort((a, b) => {
        const dateA = a.lastMessage
            ? new Date(a.lastMessage.createdAt)
            : new Date(0);
        const dateB = b.lastMessage
            ? new Date(b.lastMessage.createdAt)
            : new Date(0);
        return dateB - dateA;
    });

    return summaries;
};

/**
 * Fetch conversational message logs with a peer user or in a group conversation
 */
const getConversationMessages = async (userId, targetId, query = {}) => {
    let conversationId = null;

    if (mongoose.Types.ObjectId.isValid(targetId)) {
        // If targetId is directly a conversation ID
        const isConversation = await ChatConversation.exists({ _id: targetId });
        if (isConversation) {
            conversationId = targetId;
        } else {
            // Find direct conversation between current user and targetId (peer user)
            const myConvs = await ChatParticipant.find({ userId }).distinct(
                'conversationId'
            );
            const peerConvs = await ChatParticipant.find({
                userId: targetId
            }).distinct('conversationId');
            const commonConvs = myConvs.filter((id) =>
                peerConvs.map(String).includes(String(id))
            );

            for (const convId of commonConvs) {
                const conv = await ChatConversation.findOne({
                    _id: convId,
                    type: 'direct'
                });
                if (conv) {
                    conversationId = conv._id;
                    break;
                }
            }
        }
    }

    if (!conversationId) {
        return { messages: [], total: 0, page: 1, totalPages: 0 };
    }

    // Verify participation access
    const isParticipant = await ChatParticipant.exists({
        conversationId,
        userId
    });
    if (!isParticipant) {
        throw new AppError('Access forbidden to this conversation', 403);
    }

    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 50);
    const skip = (page - 1) * limit;

    const total = await ChatMessage.countDocuments({ conversationId });
    const messages = await ChatMessage.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name email profilePhoto department')
        .lean();

    messages.reverse();

    const populatedMessages = [];
    for (const msg of messages) {
        const [attachments, reactions, reads] = await Promise.all([
            ChatAttachment.find({ messageId: msg._id }),
            ChatReaction.find({ messageId: msg._id }).populate(
                'userId',
                'name'
            ),
            ChatMessageRead.find({ messageId: msg._id }).populate(
                'userId',
                'name'
            )
        ]);

        populatedMessages.push({
            ...msg,
            attachments,
            reactions,
            readBy: reads,
            isRead: msg.isRead || false
        });
    }

    return {
        messages: populatedMessages,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

/**
 * Send a message via API
 */
const sendMessage = async (userId, data, file = null) => {
    const { receiverId, message, messageType = 'text' } = data;
    let conversationId = null;

    if (mongoose.Types.ObjectId.isValid(receiverId)) {
        const isConversation = await ChatConversation.exists({
            _id: receiverId
        });
        if (isConversation) {
            conversationId = receiverId;
        } else {
            // Find or create direct conversation
            const myConvs = await ChatParticipant.find({ userId }).distinct(
                'conversationId'
            );
            const peerConvs = await ChatParticipant.find({
                userId: receiverId
            }).distinct('conversationId');
            const commonConvs = myConvs.filter((id) =>
                peerConvs.map(String).includes(String(id))
            );

            for (const convId of commonConvs) {
                const conv = await ChatConversation.findOne({
                    _id: convId,
                    type: 'direct'
                });
                if (conv) {
                    conversationId = conv._id;
                    break;
                }
            }

            if (!conversationId) {
                const conv = await ChatConversation.create({ type: 'direct' });
                conversationId = conv._id;
                await ChatParticipant.create([
                    { conversationId, userId },
                    { conversationId, userId: receiverId }
                ]);
            }
        }
    }

    if (!conversationId) {
        throw new AppError('Invalid receiver or conversation ID', 400);
    }

    // Verify participation
    const isParticipant = await ChatParticipant.exists({
        conversationId,
        userId
    });
    if (!isParticipant) {
        throw new AppError('Access forbidden to this conversation', 403);
    }

    // Create Message
    const msg = await ChatMessage.create({
        conversationId,
        senderId: userId,
        message: message || '',
        messageType: file
            ? file.mimetype.includes('image')
                ? 'image'
                : 'file'
            : messageType
    });

    // Handle attachment
    let attachment = null;
    if (file) {
        const {
            uploadChatAttachmentToS3
        } = require('../../shared/services/s3.service');
        const s3Url = await uploadChatAttachmentToS3(file, userId);
        attachment = await ChatAttachment.create({
            messageId: msg._id,
            fileName: file.originalname,
            filePath: s3Url,
            fileSize: file.size
        });
    }

    // Sender automatically reads their own message
    await ChatMessageRead.create({
        messageId: msg._id,
        userId,
        readAt: new Date()
    });

    const populatedMsg = await ChatMessage.findById(msg._id)
        .populate('senderId', 'name email profilePhoto department')
        .lean();

    return {
        message: {
            ...populatedMsg,
            attachments: attachment ? [attachment] : [],
            reactions: [],
            readBy: []
        },
        conversationId
    };
};

/**
 * Mark messages in conversation as read
 */
const markMessagesRead = async (userId, targetId) => {
    let conversationId = targetId;

    if (mongoose.Types.ObjectId.isValid(targetId)) {
        const isConversation = await ChatConversation.exists({ _id: targetId });
        if (!isConversation) {
            // Look up direct conversation
            const myConvs = await ChatParticipant.find({ userId }).distinct(
                'conversationId'
            );
            const peerConvs = await ChatParticipant.find({
                userId: targetId
            }).distinct('conversationId');
            const commonConvs = myConvs.filter((id) =>
                peerConvs.map(String).includes(String(id))
            );

            for (const convId of commonConvs) {
                const conv = await ChatConversation.findOne({
                    _id: convId,
                    type: 'direct'
                });
                if (conv) {
                    conversationId = conv._id;
                    break;
                }
            }
        }
    }

    if (!conversationId) return { success: true };

    const messages = await ChatMessage.find({
        conversationId,
        senderId: { $ne: userId }
    });

    for (const msg of messages) {
        const alreadyRead = await ChatMessageRead.exists({
            messageId: msg._id,
            userId
        });
        if (!alreadyRead) {
            await ChatMessageRead.create({
                messageId: msg._id,
                userId,
                readAt: new Date()
            });
        }
        msg.isRead = true;
        await msg.save();
    }

    return { success: true };
};

/**
 * Create a new group conversation
 */
const createGroup = async (
    createdBy,
    groupName,
    groupImage,
    memberIds = []
) => {
    if (!groupName?.trim()) {
        throw new AppError('Group name is required', 400);
    }

    const conv = await ChatConversation.create({ type: 'group' });
    const group = await ChatGroup.create({
        conversationId: conv._id,
        groupName: groupName.trim(),
        groupImage,
        createdBy
    });

    // Ensure creator is participant + unique members list
    const uniqueMembers = Array.from(
        new Set([String(createdBy), ...memberIds.map(String)])
    );

    await ChatParticipant.create(
        uniqueMembers.map((mId) => ({ conversationId: conv._id, userId: mId }))
    );

    return {
        conversationId: conv._id,
        groupName: group.groupName,
        groupImage: group.groupImage,
        createdBy
    };
};

/**
 * Update group details
 */
const updateGroup = async (userId, groupId, data) => {
    const group = await ChatGroup.findOne({ conversationId: groupId });
    if (!group) throw new AppError('Group not found', 404);

    const isParticipant = await ChatParticipant.exists({
        conversationId: groupId,
        userId
    });
    if (!isParticipant) throw new AppError('Access forbidden', 403);

    if (data.groupName !== undefined) group.groupName = data.groupName.trim();
    if (data.groupImage !== undefined) group.groupImage = data.groupImage;

    await group.save();
    return group;
};

/**
 * Add members to group
 */
const addGroupMembers = async (userId, groupId, memberIds) => {
    const group = await ChatGroup.findOne({ conversationId: groupId });
    if (!group) throw new AppError('Group not found', 404);

    const isParticipant = await ChatParticipant.exists({
        conversationId: groupId,
        userId
    });
    if (!isParticipant) throw new AppError('Access forbidden', 403);

    const added = [];
    for (const mId of memberIds) {
        const exists = await ChatParticipant.exists({
            conversationId: groupId,
            userId: mId
        });
        if (!exists) {
            await ChatParticipant.create({
                conversationId: groupId,
                userId: mId
            });
            added.push(mId);
        }
    }
    return { success: true, added };
};

/**
 * Remove member from group
 */
const removeGroupMember = async (userId, groupId, targetUserId) => {
    const group = await ChatGroup.findOne({ conversationId: groupId });
    if (!group) throw new AppError('Group not found', 404);

    const isSelf = String(userId) === String(targetUserId);
    const isCreator = String(group.createdBy) === String(userId);

    if (!isSelf && !isCreator) {
        throw new AppError(
            'Forbidden: Only group creator can remove other members',
            403
        );
    }

    await ChatParticipant.deleteOne({
        conversationId: groupId,
        userId: targetUserId
    });
    return { success: true };
};

/**
 * Add reaction on a message
 */
const toggleReaction = async (userId, messageId, reaction) => {
    const validReactions = ['👍', '❤️', '😂', '😮', '😢', '👏'];
    if (!validReactions.includes(reaction)) {
        throw new AppError('Invalid reaction emoji', 400);
    }

    const existing = await ChatReaction.findOne({ messageId, userId });
    if (existing) {
        if (existing.reaction === reaction) {
            await ChatReaction.deleteOne({ _id: existing._id });
            return { action: 'removed', reaction };
        } else {
            existing.reaction = reaction;
            await existing.save();
            return { action: 'updated', reaction };
        }
    } else {
        await ChatReaction.create({ messageId, userId, reaction });
        return { action: 'added', reaction };
    }
};

module.exports = {
    getChatSummary,
    getConversationMessages,
    sendMessage,
    markMessagesRead,
    createGroup,
    updateGroup,
    addGroupMembers,
    removeGroupMember,
    toggleReaction
};
