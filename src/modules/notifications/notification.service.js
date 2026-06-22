const Notification = require('./notification.model');
const AppError = require('../../shared/utils/appError');

/**
 * Create a notification for a user.
 * @param {ObjectId} userId
 * @param {string} title
 * @param {string} message
 * @param {string} type - must match the model enum
 * @param {Object} [meta] - optional metadata
 * @param {ObjectId} [meta.referenceId] - related entity _id
 * @param {string}   [meta.referenceType] - 'Task' | 'Approval' | 'Employee' | 'System'
 * @param {string}   [meta.actionUrl] - frontend navigation path
 */
const createNotification = async (
    userId,
    title,
    message,
    type,
    { referenceId = null, referenceType = 'System', actionUrl = null } = {}
) => {
    try {
        return await Notification.create({
            userId,
            title,
            message,
            type,
            referenceId,
            referenceType,
            actionUrl
        });
    } catch (error) {
        console.error('Error creating notification:', error.message);
    }
};

/**
 * Get paginated notifications for a user.
 * @param {ObjectId} userId
 * @param {number} page - 1-indexed
 * @param {number} limit
 * @returns {{ notifications, total, page, totalPages }}
 */
const getUserNotifications = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
        Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Notification.countDocuments({ userId })
    ]);
    return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

/**
 * Get count of unread notifications for a user.
 * @param {ObjectId} userId
 */
const getUnreadCount = async (userId) => {
    return Notification.countDocuments({ userId, isRead: false });
};

/**
 * Mark a single notification as read (also records readAt).
 * @param {string} id - notification _id
 */
const markAsRead = async (id, userId, roleCode) => {
    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError('Notification not found', 404);
    }
    if (roleCode === 'EMPLOYEE' || roleCode === 'Employee') {
        if (String(notification.userId) !== String(userId)) {
            throw new AppError(
                "Forbidden: Access to another user's notification is blocked.",
                403
            );
        }
    }
    if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
    }
    return notification;
};

/**
 * Mark all unread notifications for a user as read.
 * @param {ObjectId} userId
 */
const markAllAsRead = async (userId) => {
    return Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
    );
};

module.exports = {
    createNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
