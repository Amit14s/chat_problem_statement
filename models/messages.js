
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "conversation",
        required: true
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },

    clientMessageId: {
        type: String,
        default: undefined
    },

    content: {
        type: String,
        default: ""
    },

    imageOrVideoUrl: {
        type: String,
        default: null
    },

    contentType: {
        type: String,
        enum: ["image", "video", "text"],
        default: "text"
    },

    messageStatus: {
        type: String,
        enum: ["send", "sent", "delivered", "read"],
        default: "send"
    },
    deliveredTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
}],

readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
}],

    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        },
        emoji: {
            type: String
        }
    }],

    isEdited: {
        type: Boolean,
        default: false
    },

    editedAt: {
        type: Date,
        default: null
    },

    isDeleted: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

messageSchema.index({
    conversation: 1,
    createdAt: -1
});

messageSchema.index({
    sender: 1,
    clientMessageId: 1
}, {
    unique: true,
    partialFilterExpression: {
        clientMessageId: { $type: "string" }
    }
});

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
