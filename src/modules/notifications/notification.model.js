const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: [
                'Employee Created',
                'User Created',
                'Role Assigned',
                'Invitation Sent',
                'Password Changed',
                'System Alert',
                'Task Assigned',
                'Task Completed',
                'Attendance Missing',
                'Approval Request',
                'Meeting Reminder',
                'New Message'
            ],
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        },
        // Reference to the related entity (Task, Approval, etc.)
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        referenceType: {
            type: String,
            enum: ['Task', 'Approval', 'Employee', 'System', 'Chat'],
            default: 'System'
        },
        // Frontend navigation URL for this notification
        actionUrl: {
            type: String,
            default: null
        },
        // Timestamp when the notification was read
        readAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Indexes for efficient per-user queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
