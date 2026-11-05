
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
    createConversation,
    getConversations
} = require("../controller/conversationController");

const router = express.Router();

router.use(authMiddleware);

router.post("/create", createConversation);

router.get("/", getConversations);

module.exports = router;
