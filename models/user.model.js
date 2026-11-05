
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    phoneSuffix: String,

    username: {
        type: String,
        trim: true,
        default: ""
    },

    email: {
        type: String,
        lowercase: true,
        trim: true,
        sparse: true
    },

    password: {
        type: String,
        select: false
    },

    emailOtp: String,
    emailOtpExpiry: Date,

    profilePicture: {
        type: String,
        default: ""
    },

    about: {
        type: String,
        default: ""
    },

    lastSeen: {
        type: Date,
        default: Date.now
    },

    isOnline: {
        type: Boolean,
        default: false
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    agreed: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

const User = mongoose.model("user", userSchema);

module.exports = User;
