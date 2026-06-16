const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../modules/chat/chat.model');
const User = require('../modules/users/user.model');
const notificationService = require('../modules/notifications/notification.service');

/**
 * Track online users: userId (string) -> Set of socketIds
 * A user can have multiple sockets open (e.g. chat socket + notification socket).
 * Using a Set per user ensures presence is accurate across all their connections.
 */
const onlineUsers = new Map(); // userId -> Set<socketId>

const initSocket = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // JWT verification handshake middleware
    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                return next(new Error('Authentication failed: Missing token'));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            console.error(
                'Socket authentication handshake error:',
                err.message
            );
            return next(new Error('Authentication failed: Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user.userId;

        // ── Join a personal room named by userId ──────────────────────────────
        // io.to(userId) will now reach ALL sockets this user has open,
        // solving the dual-socket issue between PortalChat & notification listener.
        socket.join(userId);

        // Track socket count per user for accurate online-presence
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        console.log(
            `🔌 Socket connected: ${userId} (Socket: ${socket.id}, total: ${onlineUsers.get(userId).size})`
        );

        try {
            await User.findByIdAndUpdate(userId, { lastActive: new Date() });
        } catch (err) {
            console.error(
                'Failed to update lastActive on connect:',
                err.message
            );
        }

        // Broadcast list of currently online user IDs
        io.emit('online_users', Array.from(onlineUsers.keys()));

        // ── send_message ──────────────────────────────────────────────────────
        socket.on('send_message', async (data) => {
            try {
                const { receiverId, messageText } = data;
                if (!receiverId || !messageText) return;

                // 1. Fetch sender display name for notification
                const sender = await User.findById(userId)
                    .select('name email')
                    .lean();
                const senderName =
                    sender?.name || sender?.email || 'A colleague';

                // 2. Persist message to database
                const message = await Message.create({
                    senderId: userId,
                    receiverId,
                    messageText,
                    isRead: false
                });

                const payload = {
                    _id: message._id,
                    senderId: message.senderId.toString(),
                    receiverId: message.receiverId.toString(),
                    messageText: message.messageText,
                    isRead: message.isRead,
                    createdAt: message.createdAt
                };

                // 3. Deliver to ALL of the receiver's sockets via their room
                //    (handles PortalChat socket + notification socket simultaneously)
                const receiverIsOnline = onlineUsers.has(receiverId);
                io.to(receiverId).emit('receive_message', payload);

                // 4. Confirm to the sender's socket
                socket.emit('message_sent', payload);

                // 5. Create a persistent DB notification for the receiver
                const preview =
                    messageText.length > 60
                        ? `${messageText.substring(0, 60)}…`
                        : messageText;

                const receiver = await User.findById(receiverId).lean();
                const actionUrl = receiver?.employeeId
                    ? `/employee/dashboard?tab=chat&senderId=${userId}`
                    : `/chat?senderId=${userId}`;

                const notification =
                    await notificationService.createNotification(
                        receiverId,
                        `New message from ${senderName}`,
                        preview,
                        'New Message',
                        {
                            referenceId: message._id,
                            referenceType: 'Chat',
                            actionUrl
                        }
                    );

                // 6. Push real-time badge update to ALL of receiver's sockets
                if (receiverIsOnline && notification) {
                    io.to(receiverId).emit('new_notification', {
                        _id: notification._id,
                        title: notification.title,
                        message: notification.message,
                        type: notification.type,
                        isRead: false,
                        actionUrl: notification.actionUrl,
                        createdAt: notification.createdAt
                    });
                }
            } catch (err) {
                console.error(
                    'Socket send_message processing error:',
                    err.message
                );
            }
        });

        // ── mark_read ─────────────────────────────────────────────────────────
        socket.on('mark_read', async (data) => {
            try {
                const { senderId } = data;
                if (!senderId) return;

                await Message.updateMany(
                    { senderId, receiverId: userId, isRead: false },
                    { $set: { isRead: true } }
                );

                // Notify ALL of the original sender's sockets that messages were read
                io.to(senderId).emit('messages_read_by_receiver', {
                    readerId: userId
                });
            } catch (err) {
                console.error(
                    'Socket mark_read processing error:',
                    err.message
                );
            }
        });

        // ── disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    // Last socket for this user disconnected
                    onlineUsers.delete(userId);
                }
            }

            console.log(
                `❌ Socket disconnected: ${userId} (Socket: ${socket.id}, remaining: ${onlineUsers.get(userId)?.size ?? 0})`
            );

            try {
                await User.findByIdAndUpdate(userId, {
                    lastActive: new Date()
                });
            } catch (err) {
                console.error(
                    'Failed to update lastActive on disconnect:',
                    err.message
                );
            }

            io.emit('online_users', Array.from(onlineUsers.keys()));
        });
    });

    return io;
};

const getOnlineUsers = () => onlineUsers;

module.exports = {
    initSocket,
    getOnlineUsers
};
