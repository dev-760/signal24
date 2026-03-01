require("dotenv").config({ path: ".env.local" });
const { createServer } = require("http");
const { Server } = require("socket.io");
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");

const PORT = process.env.PORT || 3001;
const ADMIN_KEY = process.env.ADMIN_KEY || "signal24admin";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ymqsqtmnpjuqkwngfyzw.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "sb_publishable_Hoa3LMFBpKmYIuvEGn6aLQ_51JJ3iV0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/+$/, ""))
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ══════════════════════════════════════════
//  MEMORY MIRRORS (Loaded on Startup)
// ══════════════════════════════════════════
const users = new Map();       // username_lower -> { passwordHash, displayName, balance, createdAt, isAdmin }
const recentMessages = [];
const MAX_MESSAGES = 50;
const onlineUsers = new Map(); // socketId -> username
const userVotes = new Map();   // username_lower -> { betId: choiceIndex }

let betCategories = [];
const voteCounts = {};         // betId -> [count_per_choice]
const betLedger = {};          // betId -> [{username, choiceIndex, amount}]
const BET_COST = 10;

function findBet(betId) {
    for (const cat of betCategories) {
        for (const bet of cat.bets) if (bet.id === betId) return bet;
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

async function syncWithSupabase() {
    console.log("Syncing database with Supabase...");

    // 1. Users
    const { data: dbUsers, error: uErr } = await supabase.from("users").select("*");
    if (!uErr && dbUsers) {
        for (const u of dbUsers) {
            users.set(u.username, {
                passwordHash: u.password_hash,
                displayName: u.display_name,
                balance: u.balance,
                isAdmin: u.is_admin,
                createdAt: new Date(u.created_at).getTime(),
            });
        }
    }

    // Seed Dev Admin
    if (!users.has("dev")) {
        const hash = await bcrypt.hash("87T85R7u7#", 10);
        await supabase.from("users").upsert({
            username: "dev", display_name: "Dev", password_hash: hash, balance: 999999, is_admin: true
        });
        users.set("dev", { passwordHash: hash, displayName: "Dev", balance: 999999, isAdmin: true, createdAt: Date.now() });
    }

    // 2. Bets State
    const { data: dbBets } = await supabase.from("bets_state").select("*");
    if (dbBets) {
        const catsMap = new Map();
        for (const b of dbBets) {
            if (!catsMap.has(b.category)) catsMap.set(b.category, { category: b.category, tag: "live", bets: [] });
            const betObj = { id: b.bet_id, label: b.label, icon: b.icon, choices: b.choices, status: b.status };
            if (b.winner !== null) betObj.winner = b.winner;
            catsMap.get(b.category).bets.push(betObj);
        }
        betCategories = Array.from(catsMap.values());
    }

    // Initialize counts structurally
    for (const cat of betCategories) {
        for (const bet of cat.bets) {
            if (!voteCounts[bet.id]) voteCounts[bet.id] = new Array(bet.choices.length).fill(0);
            if (!betLedger[bet.id]) betLedger[bet.id] = [];
        }
    }

    // 3. Ledger
    const { data: dbLedger } = await supabase.from("bet_ledger").select("*");
    if (dbLedger) {
        for (const entry of dbLedger) {
            if (!betLedger[entry.bet_id]) betLedger[entry.bet_id] = [];
            betLedger[entry.bet_id].push({ username: entry.username, choiceIndex: entry.choice_index, amount: entry.amount });
            if (voteCounts[entry.bet_id]) voteCounts[entry.bet_id][entry.choice_index]++;
            const ukey = entry.username.toLowerCase();
            const e = userVotes.get(ukey) || {};
            e[entry.bet_id] = entry.choice_index;
            userVotes.set(ukey, e);
        }
    }

    // 4. Messages
    const { data: dbMsgs } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(MAX_MESSAGES);
    if (dbMsgs) {
        for (const m of dbMsgs.reverse()) {
            recentMessages.push({ id: m.id, type: m.type, user: m.username, text: m.text, time: m.created_at });
        }
    }

    console.log("✅ Synced! Seeded " + users.size + " users and " + betCategories.length + " bet categories.");
}

// ══════════════════════════════════════════
//  MIDDLEWARE
// ══════════════════════════════════════════
function adminAuth(req, res, next) {
    if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(403).json({ error: "Unauthorized" });
    next();
}

// ══════════════════════════════════════════
//  ENDPOINTS
// ══════════════════════════════════════════
app.get("/", (req, res) => res.json({ status: "ok", service: "Signal24", online: onlineUsers.size }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/signup", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: "Username 2-20 chars" });
    if (password.length < 3) return res.status(400).json({ error: "Password min 3 chars" });
    const ukey = username.toLowerCase();

    if (users.has(ukey)) return res.status(409).json({ error: "Username taken" });

    const hash = await bcrypt.hash(password, 10);
    const { error } = await supabase.from("users").insert({
        username: ukey, display_name: username, password_hash: hash, balance: 100, is_admin: false
    });

    if (error) return res.status(500).json({ error: "Database error" });

    users.set(ukey, { passwordHash: hash, displayName: username, balance: 100, createdAt: Date.now(), isAdmin: false });
    res.json({ ok: true, username, balance: 100 });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const user = users.get(username.toLowerCase());
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ ok: true, username: user.displayName, balance: user.balance, isAdmin: !!user.isAdmin });
});

app.get("/admin/users", adminAuth, (req, res) => {
    const list = [];
    for (const [key, u] of users) {
        const votes = userVotes.get(key) || {};
        list.push({ username: u.displayName, balance: u.balance, isAdmin: !!u.isAdmin, createdAt: u.createdAt, totalBets: Object.keys(votes).length });
    }
    res.json(list);
});

app.post("/admin/user/add", adminAuth, async (req, res) => {
    const { username, password, balance } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Required: username, password" });
    const ukey = username.toLowerCase();
    if (users.has(ukey)) return res.status(409).json({ error: "Already exists" });

    const hash = await bcrypt.hash(password, 10);
    const bal = balance || 100;
    const { error } = await supabase.from("users").insert({
        username: ukey, display_name: username, password_hash: hash, balance: bal, is_admin: false
    });
    if (error) return res.status(500).json({ error });

    users.set(ukey, { passwordHash: hash, displayName: username, balance: bal, createdAt: Date.now(), isAdmin: false });
    res.json({ ok: true });
});

app.post("/admin/user/remove", adminAuth, async (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "Required: username" });
    const ukey = username.toLowerCase();
    if (ukey === "dev") return res.status(400).json({ error: "Cannot remove dev admin" });

    await supabase.from("users").delete().eq("username", ukey);
    users.delete(ukey);
    userVotes.delete(ukey);
    res.json({ ok: true });
});

app.post("/admin/user/topup", adminAuth, async (req, res) => {
    const { username, amount } = req.body || {};
    if (!username || !amount) return res.status(400).json({ error: "Required: username, amount" });
    const ukey = username.toLowerCase();
    const user = users.get(ukey);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.balance += Number(amount);
    await supabase.from("users").update({ balance: user.balance }).eq("username", ukey);

    for (const [sid, uname] of onlineUsers) {
        if (uname.toLowerCase() === ukey) io.to(sid).emit("balance_update", user.balance);
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

app.post("/admin/bet/add", adminAuth, async (req, res) => {
    const { category, id, label, icon, choices } = req.body || {};
    if (!category || !id || !label || !choices?.length) return res.status(400).json({ error: "Required params missing" });
    if (findBet(id)) return res.status(409).json({ error: "Bet ID exists" });

    const { error } = await supabase.from("bets_state").insert({
        bet_id: id, category, label, icon: icon || "🎲", choices, status: "open"
    });
    if (error) return res.status(500).json({ error });

    let cat = betCategories.find((c) => c.category === category);
    if (!cat) { cat = { category, tag: "custom", bets: [] }; betCategories.push(cat); }
    cat.bets.push({ id, label, icon: icon || "🎲", choices, status: "open" });
    voteCounts[id] = new Array(choices.length).fill(0);
    betLedger[id] = [];

    io.emit("bet_data", { categories: betCategories, counts: voteCounts });
    res.json({ ok: true });
});

app.post("/admin/bet/remove", adminAuth, async (req, res) => {
    const { betId } = req.body || {};
    if (!betId) return res.status(400).json({ error: "Required: betId" });

    await supabase.from("bets_state").delete().eq("bet_id", betId);

    for (const cat of betCategories) cat.bets = cat.bets.filter((b) => b.id !== betId);
    betCategories = betCategories.filter((c) => c.bets.length > 0);
    delete voteCounts[betId]; delete betLedger[betId];
    io.emit("bet_data", { categories: betCategories, counts: voteCounts });
    res.json({ ok: true });
});

app.post("/admin/bet/resolve", adminAuth, async (req, res) => {
    const { betId, winningChoice } = req.body || {};
    const bet = findBet(betId);
    if (!bet) return res.status(404).json({ error: "Bet not found" });
    if (winningChoice < 0 || winningChoice >= bet.choices.length) return res.status(400).json({ error: "Invalid choice" });

    await supabase.from("bets_state").update({ status: "resolved", winner: winningChoice }).eq("bet_id", betId);
    bet.status = "resolved"; bet.winner = winningChoice;

    const ledger = betLedger[betId] || [];
    const totalPool = ledger.reduce((s, e) => s + e.amount, 0);
    const winners = ledger.filter((e) => e.choiceIndex === winningChoice);
    const winnersPool = winners.reduce((s, e) => s + e.amount, 0);

    const payouts = [];
    for (const w of winners) {
        const payout = Math.round(winnersPool > 0 ? (w.amount / winnersPool) * totalPool : 0);
        const user = users.get(w.username.toLowerCase());
        if (user) {
            user.balance += payout;
            await supabase.from("users").update({ balance: user.balance }).eq("username", w.username.toLowerCase());
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
    let totalBalance = 0, totalBetsPlaced = 0, totalPool = 0, openBets = 0, resolvedBets = 0;
    for (const [, u] of users) totalBalance += u.balance;
    for (const [, entries] of Object.entries(betLedger)) { totalBetsPlaced += entries.length; totalPool += entries.reduce((s, e) => s + e.amount, 0); }
    for (const cat of betCategories) for (const b of cat.bets) b.status === "open" ? openBets++ : resolvedBets++;
    res.json({ totalUsers: users.size, totalBalance, totalBetsPlaced, totalPool, openBets, resolvedBets, onlineNow: onlineUsers.size });
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
        recentMessages.push(joinMsg); if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();

        supabase.from("messages").insert({ type: "system", username, text: `${username} joined` }).then();
        io.emit("message", joinMsg); io.emit("online_count", onlineUsers.size);
    });

    socket.on("send_message", (data) => {
        const username = onlineUsers.get(socket.id);
        if (!username) return;
        const txt = data.text.slice(0, 500);
        const msg = { id: Date.now() + Math.random(), type: "user", user: username, text: txt, time: new Date().toISOString() };
        recentMessages.push(msg); if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();

        supabase.from("messages").insert({ type: "user", username, text: txt }).then();
        io.emit("message", msg);
    });

    socket.on("place_bet", async ({ betId, choiceIndex }) => {
        const username = onlineUsers.get(socket.id);
        if (!username) return;
        const ukey = username.toLowerCase();
        const existing = userVotes.get(ukey) || {};
        if (existing[betId] !== undefined) return;
        const bet = findBet(betId);
        if (!bet || bet.status !== "open" || choiceIndex < 0 || choiceIndex >= bet.choices.length) return;

        const user = users.get(ukey);
        if (!user || user.balance < BET_COST) return socket.emit("bet_error", "Insufficient balance");

        user.balance -= BET_COST;
        existing[betId] = choiceIndex;
        userVotes.set(ukey, existing);
        voteCounts[betId][choiceIndex]++;
        betLedger[betId].push({ username, choiceIndex, amount: BET_COST });

        socket.emit("balance_update", user.balance);
        io.emit("bet_update", { betId, counts: voteCounts[betId] });
        socket.emit("your_votes", existing);

        await supabase.from("users").update({ balance: user.balance }).eq("username", ukey);
        await supabase.from("bet_ledger").insert({ bet_id: betId, username: ukey, choice_index: choiceIndex, amount: BET_COST });
    });

    socket.on("disconnect", () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            onlineUsers.delete(socket.id);
            const leaveMsg = { id: Date.now(), type: "system", text: `${username} left`, time: new Date().toISOString() };
            recentMessages.push(leaveMsg); if (recentMessages.length > MAX_MESSAGES) recentMessages.shift();
            supabase.from("messages").insert({ type: "system", username, text: `${username} left` }).then();
            io.emit("message", leaveMsg); io.emit("online_count", onlineUsers.size);
        }
    });
});

syncWithSupabase().then(() => {
    httpServer.listen(PORT, () => console.log(`\n⚡ Signal24 Server on port ${PORT}\n`));
});
