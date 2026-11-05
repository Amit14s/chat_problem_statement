
const mongoose = require("mongoose");
const Conversation = require("../models/conversation");
const User = require("../models/user.model");

const createConversation = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user.userId;

        if (!mongoose.isValidObjectId(receiverId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid receiver ID"
            });
        }

        if (receiverId === senderId) {
            return res.status(400).json({
                success: false,
                message: "Cannot create conversation with yourself"
            });
        }

        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        let conversation = await Conversation.findOne({
            type: "private",
            participants: {
                $all: [senderId, receiverId],
                $size: 2
            }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                type: "private",
                unreadCount: 0
            });
        }

        conversation = await Conversation.findById(conversation._id)
            .populate("participants", "username email profilePicture isOnline")
            .populate("lastMessage");

        return res.status(200).json({
            success: true,
            conversation
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.userId
        })
        .populate("participants", "username email profilePicture isOnline lastSeen")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            conversations
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createConversation,
    getConversations
};
