
const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const connectToDB = require("./config/connect_to_db");
const initializeSocket = require("./services/soketService");

const authRoute = require("./routes/authRoute");
const chatRoute = require("./routes/chatRoute");
const statusRoute = require("./routes/statusRoute");
const groupRoute = require("./routes/groupRoute");
const conversationRoute = require("./routes/conversationRoute");

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        process.env.FRONTEND_URL2
    ].filter(Boolean),
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectToDB();

const io = initializeSocket(server);

app.use((req, res, next) => {
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next();
});

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Real-Time Chat API Running"
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy"
    });
});

app.use("/auth", authRoute);
app.use("/chats", chatRoute);
app.use("/status", statusRoute);
app.use("/groups", groupRoute);
app.use("/conversations", conversationRoute);

app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
