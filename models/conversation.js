
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    }],

    type: {
        type: String,
        enum: ["private", "group"],
        default: "private"
    },

    groupName: {
        type: String,
        default: ""
    },

    groupImage: {
        type: String,
        default: ""
    },

    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "message",
        default: null
    },

    unreadCount: {
        type: Number,
        default: 0
    },

    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    }

}, {
    timestamps: true
});

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ type: 1 });

const Conversation = mongoose.model(
    "conversation",
    conversationSchema
);

module.exports = Conversation;
