const Notification = require('./notification.model');
const AppError = require('../../shared/utils/appError');

const createNotification = async (userId, title, message, type) => {
    try {
        return await Notification.create({
            userId,
            title,
            message,
            type
        });
    } catch (error) {
        console.error('Error creating notification:', error.message);
    }
};

const getUserNotifications = async (userId) => {
    return await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);
};

const markAsRead = async (id) => {
    const notification = await Notification.findById(id);
    if (!notification) {
        throw new AppError('Notification not found', 404);
    }
    notification.isRead = true;
    await notification.save();
    return notification;
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead
};
