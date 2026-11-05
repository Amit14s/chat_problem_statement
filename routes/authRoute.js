
const express = require("express");
const {
    register,
    login,
    logout
} = require("../controller/passwordAuthController");
const {
    sendOtp,
    verifyotp,
    updateProfile,
    checkAuthenticated,
    getAllUser,
    searchUser,
} = require("../controller/authController");


const authMiddleware = require("../middleware/authMiddleware");

const { multerMiddleware } = require("../config/cloudinaryConfig");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyotp);

router.put(
    "/update-profile",
    authMiddleware,
    multerMiddleware,
    updateProfile
);

router.get("/check-auth", authMiddleware, checkAuthenticated);

router.get("/users", authMiddleware, getAllUser);

router.get("/search-user", authMiddleware, searchUser);

router.post("/logout", authMiddleware, logout);

router.get("/logout", logout);

module.exports = router;
