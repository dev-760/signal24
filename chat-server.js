const { createServer } = require("http");
const { Server } = require("socket.io");
const express = require("express");

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim().replace(/\/+$/, ""))
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});

// Health check endpoint (required by Render / Railway)
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "Signal24 Chat Server",
        online: onlineUsers.size,
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Store recent messages (last 50)
const recentMessages = [];
const MAX_MESSAGES = 50;

// Track online users
const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log(`[Chat] Client connected: ${socket.id}`);

    // Send recent messages to the new connection
    socket.emit("recent_messages", recentMessages);

    // Send current online count
    io.emit("online_count", onlineUsers.size);

    // User joins with a username
    socket.on("join", (username) => {
        onlineUsers.set(socket.id, username);
        console.log(`[Chat] ${username} joined (${onlineUsers.size} online)`);

        const joinMsg = {
            id: Date.now(),
            type: "system",
            text: `${username} joined the chat`,
            time: new Date().toISOString(),
        };
        recentMessages.push(joinMsg);
        if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();
        io.emit("message", joinMsg);
        io.emit("online_count", onlineUsers.size);
    });

    // User sends a message
    socket.on("send_message", (data) => {
        const username = onlineUsers.get(socket.id);
        if (!username) return;

        const msg = {
            id: Date.now() + Math.random(),
            type: "user",
            user: username,
            text: data.text.slice(0, 500),
            time: new Date().toISOString(),
        };

        recentMessages.push(msg);
        if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();

        io.emit("message", msg);
        console.log(`[Chat] ${username}: ${data.text.slice(0, 80)}`);
    });

    // User disconnects
    socket.on("disconnect", () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            onlineUsers.delete(socket.id);
            console.log(`[Chat] ${username} left (${onlineUsers.size} online)`);

            const leaveMsg = {
                id: Date.now(),
                type: "system",
                text: `${username} left the chat`,
                time: new Date().toISOString(),
            };
            recentMessages.push(leaveMsg);
            if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();
            io.emit("message", leaveMsg);
            io.emit("online_count", onlineUsers.size);
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`\n💬 Signal24 Chat Server running on port ${PORT}\n`);
});
