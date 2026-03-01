"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const CHAT_SERVER = process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:3001";

export default function LiveChat() {
    const [username, setUsername] = useState("");
    const [isJoined, setIsJoined] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [onlineCount, setOnlineCount] = useState(0);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Connect to Socket.IO server
    useEffect(() => {
        const socket = io(CHAT_SERVER, {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
        });

        socket.on("disconnect", () => {
            setConnected(false);
        });

        // Load recent messages when first connecting
        socket.on("recent_messages", (msgs) => {
            setMessages(msgs);
        });

        // Receive new messages
        socket.on("message", (msg) => {
            setMessages((prev) => [...prev.slice(-100), msg]);
        });

        // Update online count
        socket.on("online_count", (count) => {
            setOnlineCount(count);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleJoin = useCallback(
        (e) => {
            e.preventDefault();
            if (username.trim().length >= 2 && socketRef.current) {
                socketRef.current.emit("join", username.trim());
                setIsJoined(true);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        },
        [username]
    );

    const handleSend = useCallback(
        (e) => {
            e.preventDefault();
            if (!inputValue.trim() || !socketRef.current) return;

            socketRef.current.emit("send_message", { text: inputValue.trim() });
            setInputValue("");
            inputRef.current?.focus();
        },
        [inputValue]
    );

    const formatTime = (isoTime) => {
        if (!isoTime) return "";
        const d = new Date(isoTime);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const isArabic = (text) => /[\u0600-\u06FF]/.test(text);

    // Join screen
    if (!isJoined) {
        return (
            <aside className="chat-sidebar">
                <div className="chat-header">
                    <div className="chat-title">
                        <span className="chat-icon">💬</span>
                        <span>Live Chat</span>
                    </div>
                    <div className="chat-online">
                        <span className={`online-dot ${connected ? "" : "offline-dot"}`} />
                        {connected ? `${onlineCount} online` : "connecting..."}
                    </div>
                </div>
                <div className="chat-join">
                    <div className="chat-join-icon">💬</div>
                    <h3 className="chat-join-title">Join the conversation</h3>
                    <p className="chat-join-desc">Enter a username to start chatting</p>
                    <form onSubmit={handleJoin} className="chat-join-form">
                        <input
                            type="text"
                            placeholder="Your username..."
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="chat-join-input"
                            maxLength={20}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="chat-join-btn"
                            disabled={username.trim().length < 2 || !connected}
                        >
                            {connected ? "Join Chat" : "Connecting..."}
                        </button>
                    </form>
                </div>
            </aside>
        );
    }

    // Chat screen
    return (
        <aside className="chat-sidebar">
            <div className="chat-header">
                <div className="chat-title">
                    <span className="chat-icon">💬</span>
                    <span>Live Chat</span>
                </div>
                <div className="chat-online">
                    <span className={`online-dot ${connected ? "" : "offline-dot"}`} />
                    {connected ? `${onlineCount} online` : "reconnecting..."}
                </div>
            </div>

            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div
                        key={msg.id || i}
                        className={`chat-msg ${msg.type === "system" ? "chat-msg-system" : ""} ${msg.user === username ? "chat-msg-self" : ""
                            }`}
                        dir={msg.text && isArabic(msg.text) ? "rtl" : "ltr"}
                    >
                        {msg.type === "system" ? (
                            <span className="chat-system-text">{msg.text}</span>
                        ) : (
                            <>
                                <div className="chat-msg-header">
                                    <span
                                        className={`chat-username ${msg.user === username ? "chat-username-self" : ""
                                            }`}
                                    >
                                        {msg.user}
                                    </span>
                                    <span className="chat-time">{formatTime(msg.time)}</span>
                                </div>
                                <p className="chat-text">{msg.text}</p>
                            </>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="chat-input-bar">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={connected ? "Type a message..." : "Reconnecting..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="chat-input"
                    maxLength={500}
                    disabled={!connected}
                />
                <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!inputValue.trim() || !connected}
                >
                    ➤
                </button>
            </form>
        </aside>
    );
}
