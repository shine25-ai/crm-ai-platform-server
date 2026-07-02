const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const ChatConversation = require('../modules/chat/chatConversation.model');
const ChatParticipant = require('../modules/chat/chatParticipant.model');
const ChatMessage = require('../modules/chat/chatMessage.model');
const ChatMessageRead = require('../modules/chat/chatMessageRead.model');
const ChatReaction = require('../modules/chat/chatReaction.model');
const ChatGroup = require('../modules/chat/chatGroup.model');
const ChatCall = require('../modules/chat/chatCall.model');
const User = require('../modules/users/user.model');
const notificationService = require('../modules/notifications/notification.service');
const chatService = require('../modules/chat/chat.service');

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();
let ioInstance = null;

const initSocket = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });
    ioInstance = io;

    // JWT secure socket handshake middleware
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
            console.error('Socket auth error:', err.message);
            return next(new Error('Authentication failed: Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user.userId;

        // Join personal user room to push user-specific events
        socket.join(userId);

        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        console.log(
            `🔌 Socket connected: ${userId} (Total sockets: ${onlineUsers.get(userId).size})`
        );

        try {
            await User.findByIdAndUpdate(userId, {
                lastActive: new Date(),
                status: 'Active'
            });
        } catch (err) {
            console.error('Failed to update status on connect:', err.message);
        }

        // Broadcast currently online user IDs list
        io.emit('online_users', Array.from(onlineUsers.keys()));
        io.emit('user_status_changed', {
            userId,
            status: 'Active',
            lastActive: new Date()
        });

        // ── Room Joining ──────────────────────────────────────────────────────
        socket.on('join_chat', (data) => {
            const { conversationId } = data;
            if (conversationId) {
                socket.join(conversationId);
                console.log(`User ${userId} joined room ${conversationId}`);
            }
        });

        socket.on('leave_chat', (data) => {
            const { conversationId } = data;
            if (conversationId) {
                socket.leave(conversationId);
                console.log(`User ${userId} left room ${conversationId}`);
            }
        });

        // Authenticated peer-to-peer voice-call signalling. Media travels
        // directly between browsers; Socket.IO only relays WebRTC metadata.
        socket.on('call_offer', async ({ receiverId, callId, offer }) => {
            if (!receiverId || !callId || !offer) return;
            if (!/^[a-f\d]{24}$/i.test(callId)) return;
            const call = await ChatCall.findOne({
                _id: callId,
                callerId: userId,
                receiverId,
                status: 'Ringing'
            }).lean();
            if (!call) return;
            io.to(String(receiverId)).emit('call_offer', {
                callId,
                callerId: userId,
                offer
            });
        });

        socket.on('call_answer', async ({ callerId, callId, answer }) => {
            if (!callerId || !callId || !answer) return;
            if (!/^[a-f\d]{24}$/i.test(callId)) return;
            const call = await ChatCall.findOne({
                _id: callId,
                callerId,
                receiverId: userId,
                status: { $in: ['Ringing', 'Answered'] }
            }).lean();
            if (!call) return;
            io.to(String(callerId)).emit('call_answer', {
                callId,
                receiverId: userId,
                answer
            });
        });

        socket.on(
            'call_ice_candidate',
            async ({ targetUserId, callId, candidate }) => {
                if (!targetUserId || !callId || !candidate) return;
                if (!/^[a-f\d]{24}$/i.test(callId)) return;
                const call = await ChatCall.findOne({
                    _id: callId,
                    status: { $in: ['Ringing', 'Answered'] },
                    $or: [
                        { callerId: userId, receiverId: targetUserId },
                        { callerId: targetUserId, receiverId: userId }
                    ]
                }).lean();
                if (!call) return;
                io.to(String(targetUserId)).emit('call_ice_candidate', {
                    callId,
                    senderId: userId,
                    candidate
                });
            }
        );

        // ── Messaging ─────────────────────────────────────────────────────────
        socket.on('send_message', async (data) => {
            try {
                const { receiverId, message, messageType = 'text' } = data;
                if (!receiverId) return;

                // Send via service
                const result = await chatService.sendMessage(userId, {
                    receiverId,
                    message,
                    messageType
                });

                const conversationId = result.conversationId;
                const payload = result.message;

                // Deliver to conversation room
                io.to(String(conversationId)).emit('receive_message', payload);

                // Fetch sender name
                const sender = await User.findById(userId)
                    .select('name email')
                    .lean();
                const senderName =
                    sender?.name || sender?.email || 'A colleague';

                // Query all participants to trigger sidebar previews and offline notifications
                const participants = await ChatParticipant.find({
                    conversationId
                }).lean();
                const isGroup =
                    (await ChatConversation.findById(conversationId)).type ===
                    'group';

                for (const part of participants) {
                    const partUserId = part.userId.toString();
                    if (partUserId === userId) continue; // Skip sender

                    // If not in the conversation room currently, emit to their user room to refresh sidebar previews
                    io.to(partUserId).emit('receive_message', payload);

                    // Create notification if the participant is not currently in the conversation room
                    const userSockets = onlineUsers.get(partUserId);
                    let isInRoom = false;
                    if (userSockets && conversationId) {
                        const roomSockets = io.sockets.adapter.rooms.get(
                            conversationId.toString()
                        );
                        if (roomSockets) {
                            for (const socketId of userSockets) {
                                if (roomSockets.has(socketId)) {
                                    isInRoom = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!isInRoom) {
                        const preview =
                            payload.messageType === 'text'
                                ? payload.message.length > 60
                                    ? `${payload.message.substring(0, 60)}…`
                                    : payload.message
                                : `Shared a file attachment`;

                        const receiver = await User.findById(partUserId).lean();
                        const actionUrl = receiver?.employeeId
                            ? `/employee/dashboard?tab=chat&senderId=${isGroup ? conversationId : userId}`
                            : `/chat?senderId=${isGroup ? conversationId : userId}`;

                        const notification =
                            await notificationService.createNotification(
                                partUserId,
                                isGroup
                                    ? `New message in Group`
                                    : `New message from ${senderName}`,
                                preview,
                                'New Message',
                                {
                                    referenceId: payload._id,
                                    referenceType: 'Chat',
                                    actionUrl
                                }
                            );

                        if (notification) {
                            io.to(partUserId).emit('new_notification', {
                                _id: notification._id,
                                title: notification.title,
                                message: notification.message,
                                type: notification.type,
                                isRead: false,
                                actionUrl: notification.actionUrl,
                                createdAt: notification.createdAt
                            });
                        }
                    }
                }

                // Confirm to sender
                socket.emit('message_sent', payload);
            } catch (err) {
                console.error('Socket send_message error:', err.message);
            }
        });

        // ── Typing indicators ──────────────────────────────────────────────────
        socket.on('typing_start', async (data) => {
            const { conversationId } = data;
            if (!conversationId) return;

            const sender = await User.findById(userId).select('name').lean();
            socket.to(conversationId).emit('typing_indicator', {
                conversationId,
                userId,
                name: sender?.name || 'A colleague',
                isTyping: true
            });
        });

        socket.on('typing_stop', (data) => {
            const { conversationId } = data;
            if (!conversationId) return;

            socket.to(conversationId).emit('typing_indicator', {
                conversationId,
                userId,
                isTyping: false
            });
        });

        // ── Read Receipts ──────────────────────────────────────────────────────
        socket.on('mark_read', async (data) => {
            try {
                const { conversationId } = data;
                if (!conversationId) return;

                await chatService.markMessagesRead(userId, conversationId);

                // Notify other participants
                socket.to(conversationId).emit('messages_read_by_receiver', {
                    conversationId,
                    readerId: userId
                });
            } catch (err) {
                console.error('Socket mark_read error:', err.message);
            }
        });

        // ── Message Reactions ──────────────────────────────────────────────────
        socket.on('message_reaction', async (data) => {
            try {
                const { messageId, reaction, conversationId } = data;
                if (!messageId || !reaction || !conversationId) return;

                await chatService.toggleReaction(userId, messageId, reaction);

                // Fetch updated reactions list
                const reactionsList = await ChatReaction.find({ messageId })
                    .populate('userId', 'name')
                    .lean();

                io.to(String(conversationId)).emit('reaction_added', {
                    messageId,
                    reactions: reactionsList
                });
            } catch (err) {
                console.error('Socket message_reaction error:', err.message);
            }
        });

        // ── Disconnect ─────────────────────────────────────────────────────────
        socket.on('disconnect', async () => {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    const now = new Date();

                    try {
                        await User.findByIdAndUpdate(userId, {
                            lastActive: now
                        });
                        io.emit('online_users', Array.from(onlineUsers.keys()));
                        io.emit('user_status_changed', {
                            userId,
                            status: 'Offline',
                            lastActive: now
                        });
                    } catch (err) {
                        console.error(
                            'Failed to update status on disconnect:',
                            err.message
                        );
                    }
                }
            }
            console.log(`❌ Socket disconnected: ${userId}`);
        });
    });

    return io;
};

const getOnlineUsers = () => Array.from(onlineUsers.keys());

const getIo = () => ioInstance;

module.exports = {
    initSocket,
    getOnlineUsers,
    getIo
};
