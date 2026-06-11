const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../modules/chat/chat.model');
const User = require('../modules/users/user.model');

// Map to track online sockets: userId (string) -> socketId (string)
const onlineUsers = new Map();

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
            // Find token in query params or auth payload
            const token =
                socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                return next(new Error('Authentication failed: Missing token'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded; // Store decodified user details on the socket session
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
        onlineUsers.set(userId, socket.id);
        console.log(
            `🔌 User connected to Chat Socket: ${userId} (Socket: ${socket.id})`
        );

        try {
            // Update user's lastActive timestamp in database
            await User.findByIdAndUpdate(userId, { lastActive: new Date() });
        } catch (err) {
            console.error(
                'Failed to update lastActive on connect:',
                err.message
            );
        }

        // Broadcast list of currently online user IDs
        io.emit('online_users', Array.from(onlineUsers.keys()));

        // Listen for outgoing real-time messages
        socket.on('send_message', async (data) => {
            try {
                const { receiverId, messageText } = data;
                if (!receiverId || !messageText) return;

                // 1. Persist the message record to database
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

                // 2. Deliver to receiver client in real time (if currently online)
                const receiverSocketId = onlineUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receive_message', payload);
                }

                // 3. Send confirmation back to sender client
                socket.emit('message_sent', payload);
            } catch (err) {
                console.error(
                    'Socket send_message processing error:',
                    err.message
                );
            }
        });

        // Listen for marking messages as read in real time
        socket.on('mark_read', async (data) => {
            try {
                const { senderId } = data; // senderId is the other person whose messages were read by current user
                if (!senderId) return;

                // 1. Mark in database
                await Message.updateMany(
                    { senderId, receiverId: userId, isRead: false },
                    { $set: { isRead: true } }
                );

                // 2. Notify the sender client that their message is read
                const senderSocketId = onlineUsers.get(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messages_read_by_receiver', {
                        readerId: userId
                    });
                }
            } catch (err) {
                console.error(
                    'Socket mark_read processing error:',
                    err.message
                );
            }
        });

        socket.on('disconnect', async () => {
            onlineUsers.delete(userId);
            console.log(`❌ User disconnected from Chat Socket: ${userId}`);

            try {
                // Update user's lastActive timestamp on disconnect
                await User.findByIdAndUpdate(userId, {
                    lastActive: new Date()
                });
            } catch (err) {
                console.error(
                    'Failed to update lastActive on disconnect:',
                    err.message
                );
            }

            // Broadcast updated list of online user IDs
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
