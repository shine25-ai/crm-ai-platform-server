const chatService = require('./chat.service');
const chatCallService = require('./chatCall.service');
const User = require('../users/user.model');
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
            'name email department lastActive profilePhoto'
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
 * Fetch conversational message logs between the logged-in user and a peer or group conversation
 */
const getMessages = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { otherUserId } = req.params; // Can be a peer userId or conversationId
        const result = await chatService.getConversationMessages(
            userId,
            otherUserId,
            req.query
        );
        return ApiResponse.success(
            res,
            'Conversational messages retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all unread messages in the thread as read
 */
const markRead = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { senderId } = req.params; // Can be a peer userId or conversationId
        const result = await chatService.markMessagesRead(userId, senderId);
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
        const summaries = await chatService.getChatSummary(userId);
        return ApiResponse.success(
            res,
            'Chat summaries retrieved successfully',
            summaries
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Send a message manually (API-based, or socket fallback)
 */
const sendMessage = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const result = await chatService.sendMessage(
            userId,
            req.body,
            req.file
        );
        return ApiResponse.success(
            res,
            'Message sent successfully',
            result,
            201
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new group chat
 */
const createGroup = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { groupName, groupImage, memberIds } = req.body;
        const group = await chatService.createGroup(
            userId,
            groupName,
            groupImage,
            memberIds
        );
        return ApiResponse.success(
            res,
            'Group created successfully',
            group,
            201
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Update group metadata
 */
const updateGroup = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const group = await chatService.updateGroup(userId, id, req.body);
        return ApiResponse.success(res, 'Group updated successfully', group);
    } catch (error) {
        next(error);
    }
};

/**
 * Add members to group
 */
const addGroupMembers = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const result = await chatService.addGroupMembers(
            userId,
            id,
            req.body.memberIds
        );
        return ApiResponse.success(res, 'Members added successfully', result);
    } catch (error) {
        next(error);
    }
};

/**
 * Remove member from group
 */
const removeGroupMember = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id, userId: targetUserId } = req.params;
        const result = await chatService.removeGroupMember(
            userId,
            id,
            targetUserId
        );
        return ApiResponse.success(res, 'Member removed successfully', result);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete group
 */
const deleteGroup = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const result = await chatService.deleteGroup(userId, id);
        return ApiResponse.success(res, 'Group deleted successfully', result);
    } catch (error) {
        next(error);
    }
};

/**
 * Fetch conversational members of a group chat
 */
const getGroupMembers = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const result = await chatService.getGroupMembers(userId, id);
        return ApiResponse.success(
            res,
            'Group members retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle emoji reaction on message
 */
const toggleReaction = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { messageId, reaction } = req.body;
        const result = await chatService.toggleReaction(
            userId,
            messageId,
            reaction
        );
        return ApiResponse.success(
            res,
            'Reaction updated successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Upload chat attachment
 */
const {
    uploadChatAttachmentToS3
} = require('../../shared/services/s3.service');

const uploadAttachment = async (req, res, next) => {
    try {
        if (!req.file) throw new Error('No file uploaded');
        const s3Url = await uploadChatAttachmentToS3(req.file, req.user.userId);
        return ApiResponse.success(
            res,
            'File uploaded successfully',
            {
                fileName: req.file.originalname,
                filePath: s3Url,
                fileSize: req.file.size
            },
            201
        );
    } catch (error) {
        next(error);
    }
};

const listCalls = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Call history retrieved successfully',
            await chatCallService.listCalls(req.user.userId, req.query)
        );
    } catch (error) {
        next(error);
    }
};

const startCall = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Call started successfully',
            await chatCallService.startCall(req.user.userId, req.body),
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateCall = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Call updated successfully',
            await chatCallService.updateCall(
                req.user.userId,
                req.params.id,
                req.body.status
            )
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getContacts,
    getMessages,
    markRead,
    getChatSummary,
    sendMessage,
    createGroup,
    updateGroup,
    addGroupMembers,
    removeGroupMember,
    deleteGroup,
    toggleReaction,
    uploadAttachment,
    getGroupMembers,
    listCalls,
    startCall,
    updateCall
};
