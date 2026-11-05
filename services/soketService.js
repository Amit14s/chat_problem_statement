
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Message = require("../models/messages");
const Conversation = require("../models/conversation");

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL,
                process.env.FRONTEND_URL2
            ].filter(Boolean),
            credentials: true
        }
    });

    io.socketUserMap = new Map();

    io.use(async (socket, next) => {
        try {
            const cookie = socket.handshake.headers.cookie || "";

            const cookieToken = cookie
                .split("; ")
                .find(item => item.startsWith("auth_token="))
                ?.split("=")[1];

            const authToken = socket.handshake.auth?.token;

            const header = socket.handshake.headers.authorization;

            const headerToken = header?.startsWith("Bearer ")
                ? header.split(" ")[1]
                : null;

            const token = authToken || headerToken ||
                (cookieToken ? decodeURIComponent(cookieToken) : null);

            if (!token) {
                return next(new Error("Authentication required"));
            }

            const decoded = jwt.verify(token, process.env.SECRET);

            const user = await User.findById(decoded.userId);

            if (!user) {
                return next(new Error("User not found"));
            }

            socket.userId = String(user._id);

            next();

        } catch (error) {
            next(new Error("Invalid socket authentication"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.userId;

        socket.join(userId);

        if (!io.socketUserMap.has(userId)) {
            io.socketUserMap.set(userId, new Set());
        }

        io.socketUserMap.get(userId).add(socket.id);

        await User.findByIdAndUpdate(userId, {
            isOnline: true
        });

        socket.broadcast.emit("user_online", {
            userId
        });

        socket.emit("connected", {
            userId,
            message: "Connected successfully"
        });

        // Automatically join authorized conversation rooms
        const conversations = await Conversation.find({
            participants: userId
        }).select("_id");

        for (const conversation of conversations) {
            socket.join(String(conversation._id));
        }

        // Deliver pending private messages
        const pendingMessages = await Message.find({
            receiver: userId,
            messageStatus: { $in: ["send", "sent"] }
        });

        for (const message of pendingMessages) {
            message.messageStatus = "delivered";
            await message.save();

            io.to(String(message.sender)).emit(
                "message_status_update",
                {
                    messageId: String(message._id),
                    messageStatus: "delivered"
                }
            );
        }

        // Update group delivery receipts
        const groupMessages = await Message.find({
            conversation: { $in: conversations.map(c => c._id) },
            sender: { $ne: userId },
            deliveredTo: { $ne: userId }
        });

        for (const message of groupMessages) {
            const conversation = conversations.find(
                c => String(c._id) === String(message.conversation)
            );

            if (conversation) {
                const fullConversation = await Conversation.findById(
                    conversation._id
                );

                if (fullConversation?.type === "group") {
                    await Message.updateOne(
                        { _id: message._id },
                        { $addToSet: { deliveredTo: userId } }
                    );

                    io.to(String(message.sender)).emit(
                        "message_status_update",
                        {
                            messageId: String(message._id),
                            userId,
                            messageStatus: "delivered"
                        }
                    );
                }
            }
        }

        // Join conversation after membership verification
        socket.on("join_conversation", async (conversationId, callback) => {
            try {
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: userId
                });

                if (!conversation) {
                    return callback?.({
                        success: false,
                        message: "Not authorized"
                    });
                }

                socket.join(String(conversationId));

                callback?.({
                    success: true
                });

            } catch (error) {
                callback?.({
                    success: false,
                    message: "Unable to join conversation"
                });
            }
        });

        // Typing indicator
        socket.on("typing", async ({ conversationId }) => {
            const conversation = await Conversation.findOne({
                _id: conversationId,
                participants: userId
            }).select("_id");

            if (conversation) {
                socket.to(String(conversationId)).emit("typing", {
                    conversationId,
                    userId
                });
            }
        });

        socket.on("stop_typing", async ({ conversationId }) => {
            const conversation = await Conversation.findOne({
                _id: conversationId,
                participants: userId
            }).select("_id");

            if (conversation) {
                socket.to(String(conversationId)).emit("stop_typing", {
                    conversationId,
                    userId
                });
            }
        });

        // Mark conversation messages as read
        socket.on("conversation_read", async ({ conversationId }) => {
            try {
                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: userId
                });

                if (!conversation) return;

                let messages;

                if (conversation.type === "group") {
                    messages = await Message.find({
                        conversation: conversationId,
                        sender: { $ne: userId },
                        readBy: { $ne: userId }
                    });

                    await Message.updateMany(
                        {
                            conversation: conversationId,
                            sender: { $ne: userId }
                        },
                        {
                            $addToSet: { readBy: userId }
                        }
                    );

                    conversation.unreadCounts.set(userId, 0);

                } else {
                    messages = await Message.find({
                        conversation: conversationId,
                        receiver: userId,
                        messageStatus: { $ne: "read" }
                    });

                    await Message.updateMany(
                        {
                            conversation: conversationId,
                            receiver: userId
                        },
                        {
                            $set: { messageStatus: "read" }
                        }
                    );

                    conversation.unreadCount = 0;
                }

                await conversation.save();

                for (const message of messages) {
                    io.to(String(message.sender)).emit(
                        "message_status_update",
                        {
                            messageId: String(message._id),
                            userId,
                            messageStatus: "read"
                        }
                    );
                }

            } catch (error) {
                console.error("Read receipt error:", error.message);
            }
        });

        socket.on("disconnect", async () => {
            const sockets = io.socketUserMap.get(userId);

            if (sockets) {
                sockets.delete(socket.id);

                if (sockets.size === 0) {
                    io.socketUserMap.delete(userId);

                    await User.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen: new Date()
                    });

                    io.emit("user_offline", {
                        userId,
                        lastSeen: new Date()
                    });
                }
            }
        });
    });

    return io;
};

module.exports = initializeSocket;
