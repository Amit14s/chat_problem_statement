
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        const token =
            req.cookies?.auth_token ||
            (authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;
