const notificationService = require('./notification.service');
const ApiResponse = require('../../shared/utils/response');

/**
 * GET /notifications?page=1&limit=20
 * Returns paginated notifications for the authenticated user.
 */
const getNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await notificationService.getUserNotifications(
            req.user.userId,
            page,
            limit
        );
        return ApiResponse.success(
            res,
            'Notifications retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

/**
 * GET /notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
const getUnreadCount = async (req, res, next) => {
    try {
        const count = await notificationService.getUnreadCount(req.user.userId);
        return ApiResponse.success(res, 'Unread count retrieved successfully', {
            count
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /notifications/read/:id
 * Marks a single notification as read.
 */
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

/**
 * PATCH /notifications/read-all
 * Marks all notifications for the authenticated user as read.
 */
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
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
};
