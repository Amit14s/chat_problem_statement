
const mongoose = require("mongoose");
const Message = require("../models/messages");
const Conversation = require("../models/conversation");
const User = require("../models/user.model");
const response = require("../utils/responseHandler");
const { uploadToCloudinary } = require("../config/cloudinaryConfig");

const sendMessage = async (req, res) => {
    try {
        const senderId = req.user.userId;
        const {
            receiverId,
            conversationId,
            content,
            clientMessageId
        } = req.body;

        let conversation;

        if (conversationId) {
            if (!mongoose.isValidObjectId(conversationId)) {
                return response(res, 400, "Invalid conversation ID");
            }

            conversation = await Conversation.findOne({
                _id: conversationId,
                participants: senderId
            });

            if (!conversation) {
                return response(res, 403, "Not authorized");
            }

            if (conversation.type !== "group" && receiverId) {
                const validReceiver = conversation.participants.some(
                    id => id.toString() === receiverId
                );

                if (!validReceiver) {
                    return response(res, 400, "Invalid receiver");
                }
            }
        } else {
            if (!receiverId || !mongoose.isValidObjectId(receiverId)) {
                return response(res, 400, "Valid receiver ID required");
            }

            if (receiverId === senderId) {
                return response(res, 400, "Cannot message yourself");
            }

            const receiver = await User.findById(receiverId);

            if (!receiver) {
                return response(res, 404, "Receiver not found");
            }

            conversation = await Conversation.findOne({
                participants: {
                    $all: [senderId, receiverId],
                    $size: 2
                },
                $or: [
                    { type: "private" },
                    { type: { $exists: false } }
                ]
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [senderId, receiverId],
                    type: "private"
                });
            }
        }

        if (clientMessageId) {
            const existing = await Message.findOne({
                sender: senderId,
                clientMessageId
            }).populate("sender", "username profilePicture")
              .populate("receiver", "username profilePicture");

            if (existing) {
                return response(res, 200, "Message already exists", existing);
            }
        }

        const file = req.file;
        let imageOrVideoUrl = null;
        let contentType = "text";

        if (file) {
            if (!file.mimetype.startsWith("image/") &&
                !file.mimetype.startsWith("video/")) {
                return response(res, 400, "Unsupported file type");
            }

            const uploaded = await uploadToCloudinary(file);

            if (!uploaded?.secure_url) {
                return response(res, 400, "File upload failed");
            }

            imageOrVideoUrl = uploaded.secure_url;
            contentType = file.mimetype.startsWith("image/")
                ? "image"
                : "video";
        } else if (!content?.trim()) {
            return response(res, 400, "Message content required");
        }

        const receiver = conversation.type === "group"
            ? null
            : receiverId || conversation.participants.find(
                id => id.toString() !== senderId
            );

        const message = await Message.create({
            conversation: conversation._id,
            sender: senderId,
            receiver,
            content: content || "",
            contentType,
            imageOrVideoUrl,
            clientMessageId,
            messageStatus: "sent"
        });

        conversation.lastMessage = message._id;

        if (conversation.type === "group") {
            conversation.participants.forEach(id => {
                const memberId = id.toString();

                if (memberId !== senderId) {
                    const oldCount =
                        conversation.unreadCounts.get(memberId) || 0;

                    conversation.unreadCounts.set(
                        memberId,
                        oldCount + 1
                    );
                }
            });
        } else {
            conversation.unreadCount += 1;
        }

        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture");

        if (req.io) {
            if (conversation.type === "group") {
                req.io.to(String(conversation._id))
                    .emit("receive_message", populatedMessage);
            } else if (req.socketUserMap?.has(String(receiver))) {
                req.io.to(String(receiver))
                    .emit("receive_message", populatedMessage);

                message.messageStatus = "delivered";
                await message.save();
                populatedMessage.messageStatus = "delivered";
            }
        }

        return response(
            res,
            201,
            "Message sent successfully",
            populatedMessage
        );

    } catch (error) {
        if (error.code === 11000) {
            const existing = await Message.findOne({
                sender: req.user.userId,
                clientMessageId: req.body.clientMessageId
            });

            return response(res, 200, "Duplicate message", existing);
        }

        console.error(error);
        return response(res, 500, "Cannot send message", error.message);
    }
};

const getConversation = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.userId
        })
        .populate(
            "participants",
            "username profilePicture isOnline lastSeen"
        )
        .populate("lastMessage")
        .sort({ updatedAt: -1 });

        return response(
            res,
            200,
            "Conversations retrieved",
            conversations
        );

    } catch (error) {
        return response(res, 500, error.message);
    }
};

const getMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        if (!mongoose.isValidObjectId(conversationId)) {
            return response(res, 400, "Invalid conversation ID");
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });

        if (!conversation) {
            return response(res, 403, "Not authorized");
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(
            50,
            Math.max(1, Number(req.query.limit) || 30)
        );

        const messages = await Message.find({
            conversation: conversationId
        })
        .populate("sender", "username profilePicture")
        .populate("receiver", "username profilePicture")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

        if (conversation.type === "group") {
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
    await conversation.save();
} else {
            await Message.updateMany(
                {
                    conversation: conversationId,
                    receiver: userId,
                    messageStatus: { $in: ["send", "sent", "delivered"] }
                },
                { $set: { messageStatus: "read" } }
            );

            conversation.unreadCount = 0;
            await conversation.save();
        }

        return response(res, 200, "Messages retrieved", {
            messages: messages.reverse(),
            page,
            limit,
            hasMore: messages.length === limit
        });

    } catch (error) {
        return response(res, 500, "Cannot fetch messages", error.message);
    }
};

const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.body;
        const userId = req.user.userId;

        if (!mongoose.isValidObjectId(conversationId)) {
            return response(res, 400, "Invalid conversation ID");
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });

        if (!conversation) {
            return response(res, 403, "Not authorized");
        }

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
            $addToSet: {
                readBy: userId
            }
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
                { $set: { messageStatus: "read" } }
            );

            conversation.unreadCount = 0;
        }

        await conversation.save();

        if (req.io) {
            for (const message of messages) {
                req.io.to(String(message.sender)).emit(
                    "message_status_update",
                    {
                        messageId: String(message._id),
                        messageStatus: "read"
                    }
                );
            }
        }

        return response(res, 200, "Messages marked as read");

    } catch (error) {
        return response(res, 500, error.message);
    }
};

const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        if (!content?.trim()) {
            return response(res, 400, "Message content required");
        }

        const message = await Message.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            return response(res, 404, "Message not found or unauthorized");
        }

        if (message.isDeleted) {
            return response(res, 400, "Deleted message cannot be edited");
        }

        message.content = content.trim();
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();

        const populated = await Message.findById(messageId)
            .populate("sender", "username profilePicture");

        req.io?.to(String(message.conversation))
            .emit("message_edited", populated);

        return response(res, 200, "Message updated", populated);

    } catch (error) {
        return response(res, 500, error.message);
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.userId;

        const message = await Message.findOne({
            _id: messageId,
            sender: userId
        });

        if (!message) {
            return response(res, 404, "Message not found or unauthorized");
        }

        message.isDeleted = true;
        message.content = "";
        message.imageOrVideoUrl = null;

        await message.save();

        req.io?.to(String(message.conversation))
            .emit("message_deleted", String(messageId));

        return response(res, 200, "Message deleted successfully");

    } catch (error) {
        return response(res, 500, error.message);
    }
};

const addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.userId;

        if (!emoji) {
            return response(res, 400, "Emoji required");
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return response(res, 404, "Message not found");
        }

        const conversation = await Conversation.findOne({
            _id: message.conversation,
            participants: userId
        });

        if (!conversation) {
            return response(res, 403, "Not authorized");
        }

        const existing = message.reactions.find(
            r => r.user.toString() === userId
        );

        if (existing) {
            existing.emoji = emoji;
        } else {
            message.reactions.push({
                user: userId,
                emoji
            });
        }

        await message.save();

        req.io?.to(String(message.conversation))
            .emit("reaction_updated", {
                messageId,
                reactions: message.reactions
            });

        return response(res, 200, "Reaction updated", message.reactions);

    } catch (error) {
        return response(res, 500, error.message);
    }
};

module.exports = {
    sendMessage,
    getConversation,
    getMessage,
    markAsRead,
    editMessage,
    deleteMessage,
    addReaction
};
