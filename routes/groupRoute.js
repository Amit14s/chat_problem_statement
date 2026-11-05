
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
    createGroup,
    getGroups,
    getGroupDetails,
    addMember,
    removeMember
} = require("../controller/groupController");

const router = express.Router();

router.use(authMiddleware);

router.post("/create", createGroup);

router.get("/", getGroups);

router.get("/:groupId", getGroupDetails);

router.post("/:groupId/members", addMember);

router.delete("/:groupId/members/:memberId", removeMember);

module.exports = router;
