const notificationService = require('./notification.service');
const ApiResponse = require('../../shared/utils/response');

const getNotifications = async (req, res, next) => {
    try {
        const notifications = await notificationService.getUserNotifications(
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Notifications retrieved successfully',
            notifications
        );
    } catch (error) {
        next(error);
    }
};

const markNotificationAsRead = async (req, res, next) => {
    try {
        const notification = await notificationService.markAsRead(
            req.params.id
        );
        return ApiResponse.success(
            res,
            'Notification marked as read successfully',
            notification
        );
    } catch (error) {
        next(error);
    }
};

const markAllNotificationsAsRead = async (req, res, next) => {
    try {
        const result = await notificationService.markAllAsRead(req.user.userId);
        return ApiResponse.success(
            res,
            'All notifications marked as read successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
};
