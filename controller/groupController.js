
const mongoose = require("mongoose");
const Conversation = require("../models/conversation");
const User = require("../models/user.model");

const createGroup = async (req, res) => {
    try {
        const { groupName, members } = req.body;
        const userId = req.user.userId;

        if (!groupName || !groupName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Group name is required"
            });
        }

        const memberIds = [...new Set([
            ...((members || []).map(String)),
            String(userId)
        ])];

        if (memberIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: "A group needs at least two members"
            });
        }

        if (!memberIds.every(id => mongoose.isValidObjectId(id))) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID"
            });
        }

        const users = await User.find({
            _id: { $in: memberIds }
        }).select("_id");

        if (users.length !== memberIds.length) {
            return res.status(404).json({
                success: false,
                message: "One or more users not found"
            });
        }

        const group = await Conversation.create({
            participants: memberIds,
            type: "group",
            groupName: groupName.trim(),
            admins: [userId],
            createdBy: userId
        });

        const populatedGroup = await Conversation.findById(group._id)
            .populate("participants", "username email profilePicture")
            .populate("admins", "username");

        return res.status(201).json({
            success: true,
            message: "Group created successfully",
            group: populatedGroup
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getGroups = async (req, res) => {
    try {
        const groups = await Conversation.find({
            participants: req.user.userId,
            type: "group"
        })
        .populate("participants", "username email profilePicture isOnline")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            groups
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;

        if (!mongoose.isValidObjectId(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID"
            });
        }

        const group = await Conversation.findOne({
            _id: groupId,
            type: "group",
            participants: req.user.userId
        })
        .populate("participants", "username email profilePicture isOnline")
        .populate("admins", "username");

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        return res.status(200).json({
            success: true,
            group
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const addMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { memberId } = req.body;

        const group = await Conversation.findOne({
            _id: groupId,
            type: "group",
            participants: req.user.userId,
            admins: req.user.userId
        });

        if (!group) {
            return res.status(403).json({
                success: false,
                message: "Only group admins can add members"
            });
        }

        if (!mongoose.isValidObjectId(memberId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID"
            });
        }

        const user = await User.findById(memberId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (group.participants.some(id => id.toString() === memberId)) {
            return res.status(400).json({
                success: false,
                message: "User is already a member"
            });
        }

        group.participants.push(memberId);
        group.unreadCounts.set(memberId, 0);

        await group.save();

        const updatedGroup = await Conversation.findById(groupId)
            .populate("participants", "username email profilePicture")
            .populate("admins", "username");

        req.io?.to(groupId).emit("group_updated", updatedGroup);

        return res.status(200).json({
            success: true,
            message: "Member added successfully",
            group: updatedGroup
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const removeMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const userId = req.user.userId;

        if (!mongoose.isValidObjectId(groupId) ||
            !mongoose.isValidObjectId(memberId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ID"
            });
        }

        const group = await Conversation.findOne({
            _id: groupId,
            type: "group",
            participants: userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        const isAdmin = group.admins.some(
            id => id.toString() === userId
        );

        const isSelf = memberId === userId;

        if (!isAdmin && !isSelf) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        if (group.createdBy?.toString() === memberId) {
            return res.status(400).json({
                success: false,
                message: "Group creator cannot be removed"
            });
        }

        if (!group.participants.some(
            id => id.toString() === memberId
        )) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        group.participants = group.participants.filter(
            id => id.toString() !== memberId
        );

        group.admins = group.admins.filter(
            id => id.toString() !== memberId
        );

        group.unreadCounts.delete(memberId);

        await group.save();

        req.io?.to(groupId).emit("group_updated", {
            groupId,
            removedUserId: memberId
        });

        return res.status(200).json({
            success: true,
            message: "Member removed successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupDetails,
    addMember,
    removeMember
};
