
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");

const {
    sendMessage,
    getConversation,
    getMessage,
    markAsRead,
    editMessage,
    deleteMessage,
    addReaction
} = require("../controller/chatController");

const router = express.Router();

router.post(
    "/send-message",
    authMiddleware,
    multerMiddleware,
    sendMessage
);

router.get(
    "/conversations",
    authMiddleware,
    getConversation
);

router.get(
    "/conversations/:conversationId/messages",
    authMiddleware,
    getMessage
);

router.put(
    "/message/read",
    authMiddleware,
    markAsRead
);

router.put(
    "/message/:messageId",
    authMiddleware,
    editMessage
);

router.delete(
    "/message/:messageId",
    authMiddleware,
    deleteMessage
);

router.post(
    "/message/:messageId/reaction",
    authMiddleware,
    addReaction
);

module.exports = router;
