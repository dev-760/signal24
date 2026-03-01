"use client";

import { useState, useEffect, useRef } from "react";

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:3001";

function getUserColor(name) {
    const colors = ["#e63946", "#4895ef", "#2dc653", "#f9a826", "#a855f7", "#06b6d4", "#f472b6", "#84cc16"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
}

const CAT_TAGS = {
    "short-term": { color: "#e63946", bg: "rgba(230,57,70,0.1)" },
    economic: { color: "#f9a826", bg: "rgba(249,168,38,0.1)" },
    global: { color: "#4895ef", bg: "rgba(72,149,239,0.1)" },
    diplomacy: { color: "#2dc653", bg: "rgba(45,198,83,0.1)" },
    "long-term": { color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
    custom: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
};

export default function LiveChat() {
    const [collapsed, setCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState("chat");

    // Auth
    const [authMode, setAuthMode] = useState("login");
    const [user, setUser] = useState(null);
    const [authUser, setAuthUser] = useState("");
    const [authPass, setAuthPass] = useState("");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    // Balance
    const [balance, setBalance] = useState(0);
    const [showTopUp, setShowTopUp] = useState(false);

    // Chat
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [onlineCount, setOnlineCount] = useState(0);
    const [connected, setConnected] = useState(false);

    // Bets
    const [betCategories, setBetCategories] = useState([]);
    const [voteCounts, setVoteCounts] = useState({});
    const [myVotes, setMyVotes] = useState({});
    const [expandedCat, setExpandedCat] = useState(null);
    const [betError, setBetError] = useState("");
    const [wonNotif, setWonNotif] = useState(null);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auth
    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError("");
        const name = authUser.trim(), pass = authPass.trim();
        if (!name || !pass) { setAuthError("Fill in both fields"); return; }
        setAuthLoading(true);
        try {
            const res = await fetch(`${CHAT_URL}/${authMode}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: name, password: pass }),
            });
            const data = await res.json();
            if (!res.ok) { setAuthError(data.error || "Error"); return; }
            setUser({ username: data.username });
            setBalance(data.balance || 0);
            if (socketRef.current) socketRef.current.emit("auth", data.username);
            setTimeout(() => inputRef.current?.focus(), 200);
        } catch { setAuthError("Cannot connect"); }
        finally { setAuthLoading(false); }
    };

    // Socket
    useEffect(() => {
        let socket;
        (async () => {
            try {
                const { io } = await import("socket.io-client");
                socket = io(CHAT_URL, { transports: ["websocket", "polling"], reconnectionAttempts: 5, timeout: 8000 });
                socketRef.current = socket;
                socket.on("connect", () => setConnected(true));
                socket.on("disconnect", () => setConnected(false));
                socket.on("online_count", (c) => setOnlineCount(c));
                socket.on("recent_messages", (msgs) => setMessages(msgs));
                socket.on("message", (msg) => setMessages((p) => [...p.slice(-99), msg]));
                socket.on("bet_data", ({ categories, counts }) => {
                    setBetCategories(categories);
                    setVoteCounts(counts);
                    if (categories.length && !expandedCat) setExpandedCat(categories[0].category);
                });
                socket.on("bet_update", ({ betId, counts }) => setVoteCounts((p) => ({ ...p, [betId]: counts })));
                socket.on("your_votes", (v) => setMyVotes(v));
                socket.on("balance_update", (b) => setBalance(b));
                socket.on("bet_error", (msg) => { setBetError(msg); setTimeout(() => setBetError(""), 3000); });
                socket.on("bet_won", ({ betId, payout, choice }) => {
                    setWonNotif({ payout, choice });
                    setTimeout(() => setWonNotif(null), 5000);
                });
                socket.on("bet_resolved", ({ betId, winningChoice, choiceLabel }) => {
                    // handled by bet_data refresh
                });
            } catch { setConnected(false); }
        })();
        return () => { if (socket) socket.disconnect(); };
    }, []);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || !socketRef.current) return;
        socketRef.current.emit("send_message", { text });
        setInput("");
    };

    const placeBet = (betId, ci) => {
        if (myVotes[betId] !== undefined || !socketRef.current) return;
        socketRef.current.emit("place_bet", { betId, choiceIndex: ci });
    };

    const formatTime = (iso) => {
        try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
    };

    const getTotalVotes = (id) => { const c = voteCounts[id]; return c ? c.reduce((s, v) => s + v, 0) : 0; };
    const getPct = (id, i) => { const t = getTotalVotes(id); return t === 0 ? 0 : Math.round((voteCounts[id][i] / t) * 100); };

    return (
        <aside className={`chat-sidebar ${collapsed ? "chat-collapsed" : ""}`}>
            {/* Header */}
            <div className="chat-header" onClick={() => setCollapsed(!collapsed)}>
                <span className="chat-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    {user ? user.username : "Signal24"}
                </span>
                <div className="chat-header-right">
                    <span className="chat-online">
                        <span className={`online-dot ${connected ? "" : "offline-dot"}`} />
                        {connected ? (onlineCount > 0 ? `${onlineCount}` : "●") : "..."}
                    </span>
                    <svg className="chat-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{ transform: collapsed ? "rotate(180deg)" : "none" }}>
                        <polyline points="18 15 12 9 6 15" />
                    </svg>
                </div>
            </div>

            {!collapsed && (
                <>
                    {/* Tabs */}
                    <div className="sidebar-tabs">
                        <button className={`sidebar-tab ${activeTab === "chat" ? "sidebar-tab-active" : ""}`} onClick={() => setActiveTab("chat")}>Chat</button>
                        <button className={`sidebar-tab ${activeTab === "bets" ? "sidebar-tab-active" : ""}`} onClick={() => setActiveTab("bets")}>Conflict League</button>
                    </div>

                    {/* Auth - compact inline */}
                    {!user ? (
                        <div className="auth-compact">
                            <form className="auth-row" onSubmit={handleAuth}>
                                <input type="text" placeholder="Username" value={authUser} onChange={(e) => setAuthUser(e.target.value)} maxLength={20} className="auth-sm-input" />
                                <input type="password" placeholder="Pass" value={authPass} onChange={(e) => setAuthPass(e.target.value)} maxLength={50} className="auth-sm-input" />
                                <button type="submit" className="auth-sm-btn" disabled={authLoading || !connected}>
                                    {authMode === "login" ? "→" : "+"}
                                </button>
                            </form>
                            <div className="auth-sm-footer">
                                {authError && <span className="auth-sm-error">{authError}</span>}
                                <button className="auth-sm-toggle" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}>
                                    {authMode === "login" ? "Sign up" : "Log in"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Balance Bar */}
                            <div className="balance-bar">
                                <div className="balance-info">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" /></svg>
                                    <span className="balance-amount">{balance.toLocaleString()}</span>
                                    <span className="balance-label">coins</span>
                                </div>
                                <button className="topup-btn" onClick={() => setShowTopUp(true)}>Top Up</button>
                            </div>

                            {/* Win notification */}
                            {wonNotif && (
                                <div className="win-notif">
                                    <span>🎉</span>
                                    <span>You won <strong>{wonNotif.payout}</strong> coins! ({wonNotif.choice})</span>
                                </div>
                            )}

                            {/* Bet error */}
                            {betError && <div className="bet-err">{betError}</div>}

                            {/* CHAT TAB */}
                            {activeTab === "chat" && (
                                <>
                                    <div className="chat-messages">
                                        {messages.length === 0 && (
                                            <div className="chat-empty">
                                                <p>No messages yet</p>
                                                <span>Be the first to chat</span>
                                            </div>
                                        )}
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`chat-msg ${msg.type === "system" ? "chat-msg-system" : ""}`}>
                                                {msg.type === "system" ? (
                                                    <span className="chat-system-text">{msg.text}</span>
                                                ) : (
                                                    <div className="chat-msg-row">
                                                        <div className="chat-avatar" style={{ background: `${getUserColor(msg.user)}18`, color: getUserColor(msg.user), border: `1px solid ${getUserColor(msg.user)}30` }}>
                                                            {msg.user[0].toUpperCase()}
                                                        </div>
                                                        <div className="chat-msg-body">
                                                            <div className="chat-msg-header">
                                                                <span className="chat-username" style={{ color: getUserColor(msg.user) }}>{msg.user}</span>
                                                                <span className="chat-time">{formatTime(msg.time)}</span>
                                                            </div>
                                                            <p className="chat-text">{msg.text}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <form className="chat-input-bar" onSubmit={handleSend}>
                                        <input ref={inputRef} type="text" className="chat-input" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} />
                                        <button type="submit" className="chat-send-btn" disabled={!input.trim()}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                        </button>
                                    </form>
                                </>
                            )}

                            {/* CONFLICT LEAGUE TAB */}
                            {activeTab === "bets" && (
                                <div className="bet-panel">
                                    <div className="bet-header">
                                        <span className="bet-header-icon">⚡</span>
                                        <div>
                                            <h3 className="bet-title">The Conflict League</h3>
                                            <p className="bet-subtitle">10 coins per bet · Vote on what happens next</p>
                                        </div>
                                    </div>
                                    <div className="bet-categories">
                                        {betCategories.map((cat) => {
                                            const tag = CAT_TAGS[cat.tag] || CAT_TAGS.custom;
                                            const isOpen = expandedCat === cat.category;
                                            return (
                                                <div key={cat.category} className={`bet-category ${isOpen ? "bet-category-open" : ""}`}>
                                                    <button className="bet-cat-header" onClick={() => setExpandedCat(isOpen ? null : cat.category)}>
                                                        <div className="bet-cat-left">
                                                            <span className="bet-cat-tag" style={{ color: tag.color, background: tag.bg }}>{cat.tag}</span>
                                                            <span className="bet-cat-name">{cat.category}</span>
                                                        </div>
                                                        <div className="bet-cat-right">
                                                            <span className="bet-cat-count">{cat.bets.length}</span>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                                                                <polyline points="6 9 12 15 18 9" />
                                                            </svg>
                                                        </div>
                                                    </button>
                                                    {isOpen && (
                                                        <div className="bet-cat-body">
                                                            {cat.bets.map((bet) => {
                                                                const total = getTotalVotes(bet.id);
                                                                const voted = myVotes[bet.id];
                                                                const resolved = bet.status === "resolved";
                                                                return (
                                                                    <div key={bet.id} className={`bet-card ${voted !== undefined ? "bet-card-voted" : ""} ${resolved ? "bet-card-resolved" : ""}`}>
                                                                        <div className="bet-question">
                                                                            <span className="bet-icon">{bet.icon}</span>
                                                                            <span className="bet-label">{bet.label}</span>
                                                                            {resolved && <span className="bet-resolved-badge">CLOSED</span>}
                                                                        </div>
                                                                        {total > 0 && <span className="bet-total">{total} vote{total !== 1 ? "s" : ""} · pool {total * 10} coins</span>}
                                                                        <div className="bet-choices">
                                                                            {bet.choices.map((choice, ci) => {
                                                                                const pct = getPct(bet.id, ci);
                                                                                const isMyVote = voted === ci;
                                                                                const isWinner = resolved && bet.winner === ci;
                                                                                return (
                                                                                    <button key={ci}
                                                                                        className={`bet-choice ${isMyVote ? "bet-choice-mine" : ""} ${voted !== undefined ? "bet-choice-locked" : ""} ${isWinner ? "bet-choice-winner" : ""}`}
                                                                                        onClick={() => placeBet(bet.id, ci)}
                                                                                        disabled={voted !== undefined || resolved}>
                                                                                        <div className="bet-choice-bar" style={{ width: `${pct}%`, background: isWinner ? "var(--accent-green)" : isMyVote ? tag.color : "rgba(255,255,255,0.04)" }} />
                                                                                        <span className="bet-choice-label">{choice}</span>
                                                                                        {total > 0 && <span className="bet-choice-pct">{pct}%</span>}
                                                                                        {isMyVote && <span className="bet-choice-check">✓</span>}
                                                                                        {isWinner && <span className="bet-choice-check">🏆</span>}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* TOP UP MODAL */}
                    {showTopUp && (
                        <div className="topup-overlay" onClick={() => setShowTopUp(false)}>
                            <div className="topup-modal" onClick={(e) => e.stopPropagation()}>
                                <button className="topup-close" onClick={() => setShowTopUp(false)}>✕</button>
                                <h3 className="topup-title">Top Up Balance</h3>
                                <p className="topup-desc">Scan the QR code below to add coins to your account</p>
                                <div className="topup-qr">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://alchemy.com/pay/${user?.username || "signal24"}&bgcolor=0e0e1f&color=ffffff`} alt="Top Up QR" width={180} height={180} />
                                </div>
                                <div className="topup-info">
                                    <span className="topup-wallet">Alchemy Pay</span>
                                    <span className="topup-address">{user?.username || "signal24"}</span>
                                </div>
                                <p className="topup-hint">Contact admin for manual top-up</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </aside>
    );
}
