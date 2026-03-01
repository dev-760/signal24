const { createServer } = require("http");
const { Server } = require("socket.io");
const express = require("express");

const PORT = process.env.PORT || 3001;
const ADMIN_KEY = process.env.ADMIN_KEY || "signal24admin";
const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/+$/, ""))
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

app.use(express.json());

// ══════════════════════════════════════════
//  IN-MEMORY STORES
// ══════════════════════════════════════════
const users = new Map();       // username_lower -> { password, displayName, balance, createdAt, isAdmin }
const recentMessages = [];
const MAX_MESSAGES = 50;
const onlineUsers = new Map(); // socketId -> username
const userVotes = new Map();   // username_lower -> { betId: choiceIndex }

// Seed admin
users.set("dev", { password: "87T85R7u7#", displayName: "Dev", balance: 999999, createdAt: Date.now(), isAdmin: true });

// ══════════════════════════════════════════
//  BET SYSTEM
// ══════════════════════════════════════════
const BET_COST = 10; // cost per bet

let betCategories = [
    {
        category: "Escalation Bets", tag: "short-term",
        bets: [
            { id: "strike-30d", label: "Direct Military Strike Within 30 Days", icon: "🎯", choices: ["Yes", "No"], status: "open" },
            { id: "naval-clash", label: "Naval Clash in the Persian Gulf", icon: "⚓", choices: ["Yes", "No"], status: "open" },
            { id: "cyberattack", label: "Cyberattack Causing Major Infrastructure Disruption", icon: "💻", choices: ["Yes", "No"], status: "open" },
        ],
    },
    {
        category: "Economic / Strategic", tag: "economic",
        bets: [
            { id: "hormuz", label: "Strait of Hormuz Disruption", icon: "🚢", choices: ["No disruption", "Partial (<7 days)", "Major closure (7+ days)"], status: "open" },
            { id: "oil-spike", label: "Oil Price Spike", icon: "🛢️", choices: ["+10%", "+25%", "+50% or more"], status: "open" },
            { id: "sanctions", label: "New Sanctions Announced", icon: "📜", choices: ["Minor", "Major", "None"], status: "open" },
        ],
    },
    {
        category: "International Involvement", tag: "global",
        bets: [
            { id: "israel-direct", label: "Israel Enters Directly", icon: "🇮🇱", choices: ["Yes", "No"], status: "open" },
            { id: "nato", label: "NATO Involvement", icon: "🏛️", choices: ["Political only", "Military support", "None"], status: "open" },
            { id: "russia-china", label: "Russia or China Support Iran", icon: "🌐", choices: ["Diplomatic only", "Military aid", "None"], status: "open" },
        ],
    },
    {
        category: "De-escalation / Diplomacy", tag: "diplomacy",
        bets: [
            { id: "ceasefire-60d", label: "Ceasefire Within 60 Days", icon: "🕊️", choices: ["Yes", "No"], status: "open" },
            { id: "negotiations", label: "Formal Negotiations Begin", icon: "🤝", choices: ["Yes", "No"], status: "open" },
        ],
    },
    {
        category: "Long-Term Outcome", tag: "long-term",
        bets: [
            { id: "limited-conflict", label: "Conflict Remains Limited (No Full War)", icon: "⚖️", choices: ["Yes", "No"], status: "open" },
            { id: "iran-instability", label: "Regime Instability in Iran", icon: "🔥", choices: ["Major unrest", "Minor unrest"], status: "open" },
        ],
    },
];

// Vote counts: betId -> [count_per_choice]
const voteCounts = {};
// Track who bet on what with amount: betId -> [{username, choiceIndex, amount}]
const betLedger = {};

function initBetCounts() {
    for (const cat of betCategories) {
        for (const bet of cat.bets) {
            if (!voteCounts[bet.id]) voteCounts[bet.id] = new Array(bet.choices.length).fill(0);
            if (!betLedger[bet.id]) betLedger[bet.id] = [];
        }
    }
}
initBetCounts();

function findBet(betId) {
    for (const cat of betCategories) {
        for (const bet of cat.bets) {
            if (bet.id === betId) return bet;
        }
    }
    return null;
}

function getOdds(betId) {
    const counts = voteCounts[betId];
    if (!counts) return [];
    const total = counts.reduce((s, v) => s + v, 0);
    if (total === 0) return counts.map(() => 2.0);
    return counts.map((c) => (c === 0 ? total + 1 : +(total / c).toFixed(2)));
}

// ══════════════════════════════════════════
//  MIDDLEWARE
// ══════════════════════════════════════════
function adminAuth(req, res, next) {
    const key = req.headers["x-admin-key"];
    if (key !== ADMIN_KEY) return res.status(403).json({ error: "Unauthorized" });
    next();
}

// ══════════════════════════════════════════
//  PUBLIC ENDPOINTS
// ══════════════════════════════════════════
app.get("/", (req, res) => res.json({ status: "ok", service: "Signal24", online: onlineUsers.size }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/signup", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: "Username 2-20 chars" });
    if (password.length < 3) return res.status(400).json({ error: "Password min 3 chars" });
    const ukey = username.toLowerCase();
    if (users.has(ukey)) return res.status(409).json({ error: "Username taken" });
    users.set(ukey, { password, displayName: username, balance: 100, createdAt: Date.now(), isAdmin: false });
    res.json({ ok: true, username, balance: 100 });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const user = users.get(username.toLowerCase());
    if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ ok: true, username: user.displayName, balance: user.balance, isAdmin: !!user.isAdmin });
});

// ══════════════════════════════════════════
//  ADMIN ENDPOINTS
// ══════════════════════════════════════════
app.get("/admin/users", adminAuth, (req, res) => {
    const list = [];
    for (const [key, u] of users) {
        const votes = userVotes.get(key) || {};
        list.push({ username: u.displayName, balance: u.balance, isAdmin: !!u.isAdmin, createdAt: u.createdAt, totalBets: Object.keys(votes).length });
    }
    res.json(list);
});

app.post("/admin/user/add", adminAuth, (req, res) => {
    const { username, password, balance } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Required: username, password" });
    const ukey = username.toLowerCase();
    if (users.has(ukey)) return res.status(409).json({ error: "Already exists" });
    users.set(ukey, { password, displayName: username, balance: balance || 100, createdAt: Date.now(), isAdmin: false });
    res.json({ ok: true });
});

app.post("/admin/user/remove", adminAuth, (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "Required: username" });
    const ukey = username.toLowerCase();
    if (ukey === "dev") return res.status(400).json({ error: "Cannot remove dev admin" });
    users.delete(ukey);
    userVotes.delete(ukey);
    res.json({ ok: true });
});

app.post("/admin/user/topup", adminAuth, (req, res) => {
    const { username, amount } = req.body || {};
    if (!username || !amount) return res.status(400).json({ error: "Required: username, amount" });
    const ukey = username.toLowerCase();
    const user = users.get(ukey);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.balance += Number(amount);
    // Notify the user if online
    for (const [sid, uname] of onlineUsers) {
        if (uname.toLowerCase() === ukey) {
            io.to(sid).emit("balance_update", user.balance);
        }
    }
    res.json({ ok: true, newBalance: user.balance });
});

app.get("/admin/bets", adminAuth, (req, res) => {
    const result = betCategories.map((cat) => ({
        ...cat,
        bets: cat.bets.map((b) => ({
            ...b,
            counts: voteCounts[b.id] || [],
            odds: getOdds(b.id),
            totalPool: (betLedger[b.id] || []).reduce((s, e) => s + e.amount, 0),
            voters: (betLedger[b.id] || []).length,
        })),
    }));
    res.json(result);
});

app.post("/admin/bet/add", adminAuth, (req, res) => {
    const { category, id, label, icon, choices } = req.body || {};
    if (!category || !id || !label || !choices?.length) return res.status(400).json({ error: "Required: category, id, label, choices[]" });
    if (findBet(id)) return res.status(409).json({ error: "Bet ID already exists" });
    let cat = betCategories.find((c) => c.category === category);
    if (!cat) {
        cat = { category, tag: "custom", bets: [] };
        betCategories.push(cat);
    }
    cat.bets.push({ id, label, icon: icon || "🎲", choices, status: "open" });
    voteCounts[id] = new Array(choices.length).fill(0);
    betLedger[id] = [];
    io.emit("bet_data", { categories: betCategories, counts: voteCounts });
    res.json({ ok: true });
});

app.post("/admin/bet/remove", adminAuth, (req, res) => {
    const { betId } = req.body || {};
    if (!betId) return res.status(400).json({ error: "Required: betId" });
    for (const cat of betCategories) {
        cat.bets = cat.bets.filter((b) => b.id !== betId);
    }
    betCategories = betCategories.filter((c) => c.bets.length > 0);
    delete voteCounts[betId];
    delete betLedger[betId];
    io.emit("bet_data", { categories: betCategories, counts: voteCounts });
    res.json({ ok: true });
});

app.post("/admin/bet/resolve", adminAuth, (req, res) => {
    const { betId, winningChoice } = req.body || {};
    const bet = findBet(betId);
    if (!bet) return res.status(404).json({ error: "Bet not found" });
    if (winningChoice < 0 || winningChoice >= bet.choices.length) return res.status(400).json({ error: "Invalid choice" });

    bet.status = "resolved";
    bet.winner = winningChoice;

    const ledger = betLedger[betId] || [];
    const totalPool = ledger.reduce((s, e) => s + e.amount, 0);
    const winners = ledger.filter((e) => e.choiceIndex === winningChoice);
    const winnersPool = winners.reduce((s, e) => s + e.amount, 0);

    const payouts = [];
    for (const w of winners) {
        const share = winnersPool > 0 ? (w.amount / winnersPool) * totalPool : 0;
        const payout = Math.round(share);
        const user = users.get(w.username.toLowerCase());
        if (user) {
            user.balance += payout;
            payouts.push({ username: w.username, payout });
            for (const [sid, uname] of onlineUsers) {
                if (uname.toLowerCase() === w.username.toLowerCase()) {
                    io.to(sid).emit("balance_update", user.balance);
                    io.to(sid).emit("bet_won", { betId, payout, choice: bet.choices[winningChoice] });
                }
            }
        }
    }

    io.emit("bet_resolved", { betId, winningChoice, choiceLabel: bet.choices[winningChoice] });
    io.emit("bet_data", { categories: betCategories, counts: voteCounts });
    res.json({ ok: true, totalPool, winnersCount: winners.length, payouts });
});

app.get("/admin/stats", adminAuth, (req, res) => {
    let totalUsers = users.size;
    let totalBalance = 0;
    for (const [, u] of users) totalBalance += u.balance;
    let totalBetsPlaced = 0;
    for (const [, entries] of Object.entries(betLedger)) totalBetsPlaced += entries.length;
    let totalPool = 0;
    for (const [, entries] of Object.entries(betLedger)) totalPool += entries.reduce((s, e) => s + e.amount, 0);
    let openBets = 0, resolvedBets = 0;
    for (const cat of betCategories) for (const b of cat.bets) b.status === "open" ? openBets++ : resolvedBets++;
    res.json({ totalUsers, totalBalance, totalBetsPlaced, totalPool, openBets, resolvedBets, onlineNow: onlineUsers.size });
});

// ══════════════════════════════════════════
//  SOCKET
// ══════════════════════════════════════════
io.on("connection", (socket) => {
    socket.emit("recent_messages", recentMessages);
    socket.emit("bet_data", { categories: betCategories, counts: voteCounts });
    io.emit("online_count", onlineUsers.size);

    socket.on("auth", (username) => {
        const ukey = username.toLowerCase();
        onlineUsers.set(socket.id, username);
        const user = users.get(ukey);
        const votes = userVotes.get(ukey) || {};
        socket.emit("your_votes", votes);
        if (user) socket.emit("balance_update", user.balance);

        const joinMsg = { id: Date.now(), type: "system", text: `${username} joined`, time: new Date().toISOString() };
        recentMessages.push(joinMsg);
        if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();
        io.emit("message", joinMsg);
        io.emit("online_count", onlineUsers.size);
    });

    socket.on("send_message", (data) => {
        const username = onlineUsers.get(socket.id);
        if (!username) return;
        const msg = { id: Date.now() + Math.random(), type: "user", user: username, text: data.text.slice(0, 500), time: new Date().toISOString() };
        recentMessages.push(msg);
        if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();
        io.emit("message", msg);
    });

    socket.on("place_bet", ({ betId, choiceIndex }) => {
        const username = onlineUsers.get(socket.id);
        if (!username) return;
        const ukey = username.toLowerCase();
        const existing = userVotes.get(ukey) || {};
        if (existing[betId] !== undefined) return;
        const bet = findBet(betId);
        if (!bet || bet.status !== "open") return;
        if (choiceIndex < 0 || choiceIndex >= bet.choices.length) return;

        const user = users.get(ukey);
        if (!user || user.balance < BET_COST) {
            socket.emit("bet_error", "Insufficient balance");
            return;
        }

        user.balance -= BET_COST;
        existing[betId] = choiceIndex;
        userVotes.set(ukey, existing);
        voteCounts[betId][choiceIndex]++;
        betLedger[betId].push({ username, choiceIndex, amount: BET_COST });

        socket.emit("balance_update", user.balance);
        io.emit("bet_update", { betId, counts: voteCounts[betId] });
        socket.emit("your_votes", existing);
    });

    socket.on("disconnect", () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            onlineUsers.delete(socket.id);
            const leaveMsg = { id: Date.now(), type: "system", text: `${username} left`, time: new Date().toISOString() };
            recentMessages.push(leaveMsg);
            if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();
            io.emit("message", leaveMsg);
            io.emit("online_count", onlineUsers.size);
        }
    });
});

httpServer.listen(PORT, () => console.log(`\n⚡ Signal24 Server on port ${PORT}\n`));
