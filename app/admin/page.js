"use client";

import { useState, useEffect, useCallback } from "react";

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL;

export default function AdminPage() {
    const [adminKey, setAdminKey] = useState("");
    const [authed, setAuthed] = useState(false);
    const [activeSection, setActiveSection] = useState("dashboard");

    // Data
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [bets, setBets] = useState([]);

    // Forms
    const [newUser, setNewUser] = useState({ username: "", password: "", balance: 100 });
    const [topUpForm, setTopUpForm] = useState({ username: "", amount: "" });
    const [newBet, setNewBet] = useState({ category: "", id: "", label: "", icon: "🎲", choices: "" });
    const [resolveForm, setResolveForm] = useState({ betId: "", choice: 0 });

    const [msg, setMsg] = useState("");
    const [error, setError] = useState("");

    const headers = { "Content-Type": "application/json", "x-admin-key": adminKey };

    const flash = (text, isErr = false) => {
        if (isErr) { setError(text); setMsg(""); } else { setMsg(text); setError(""); }
        setTimeout(() => { setMsg(""); setError(""); }, 4000);
    };

    const fetchAll = useCallback(async () => {
        if (!authed) return;
        try {
            const [s, u, b] = await Promise.all([
                fetch(`${CHAT_URL}/admin/stats`, { headers }).then((r) => r.json()),
                fetch(`${CHAT_URL}/admin/users`, { headers }).then((r) => r.json()),
                fetch(`${CHAT_URL}/admin/bets`, { headers }).then((r) => r.json()),
            ]);
            setStats(s);
            setUsers(u);
            setBets(b);
        } catch {
            flash("Failed to fetch data", true);
        }
    }, [authed, adminKey]);

    useEffect(() => { if (authed) fetchAll(); }, [authed, fetchAll]);
    useEffect(() => { if (authed) { const i = setInterval(fetchAll, 5000); return () => clearInterval(i); } }, [authed, fetchAll]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${CHAT_URL}/admin/stats`, { headers: { "x-admin-key": adminKey } });
            if (res.ok) { setAuthed(true); } else { flash("Invalid admin key", true); }
        } catch { flash("Cannot connect to server", true); }
    };

    // User actions
    const addUser = async (e) => {
        e.preventDefault();
        const res = await fetch(`${CHAT_URL}/admin/user/add`, { method: "POST", headers, body: JSON.stringify(newUser) });
        const d = await res.json();
        if (res.ok) { flash(`User "${newUser.username}" added`); setNewUser({ username: "", password: "", balance: 100 }); fetchAll(); }
        else flash(d.error, true);
    };

    const removeUser = async (username) => {
        if (!confirm(`Remove user "${username}"?`)) return;
        const res = await fetch(`${CHAT_URL}/admin/user/remove`, { method: "POST", headers, body: JSON.stringify({ username }) });
        const d = await res.json();
        if (res.ok) { flash(`User "${username}" removed`); fetchAll(); }
        else flash(d.error, true);
    };

    const topUpUser = async (e) => {
        e.preventDefault();
        const res = await fetch(`${CHAT_URL}/admin/user/topup`, { method: "POST", headers, body: JSON.stringify({ username: topUpForm.username, amount: Number(topUpForm.amount) }) });
        const d = await res.json();
        if (res.ok) { flash(`Added ${topUpForm.amount} coins to "${topUpForm.username}"`); setTopUpForm({ username: "", amount: "" }); fetchAll(); }
        else flash(d.error, true);
    };

    // Bet actions
    const addBet = async (e) => {
        e.preventDefault();
        const choices = newBet.choices.split(",").map((c) => c.trim()).filter(Boolean);
        if (choices.length < 2) { flash("Need at least 2 choices (comma-separated)", true); return; }
        const res = await fetch(`${CHAT_URL}/admin/bet/add`, { method: "POST", headers, body: JSON.stringify({ ...newBet, choices }) });
        const d = await res.json();
        if (res.ok) { flash(`Bet "${newBet.label}" added`); setNewBet({ category: "", id: "", label: "", icon: "🎲", choices: "" }); fetchAll(); }
        else flash(d.error, true);
    };

    const removeBet = async (betId) => {
        if (!confirm(`Remove bet "${betId}"?`)) return;
        const res = await fetch(`${CHAT_URL}/admin/bet/remove`, { method: "POST", headers, body: JSON.stringify({ betId }) });
        if (res.ok) { flash(`Bet "${betId}" removed`); fetchAll(); }
        else flash((await res.json()).error, true);
    };

    const resolveBet = async (betId, choiceIndex) => {
        const bet = bets.flatMap((c) => c.bets).find((b) => b.id === betId);
        if (!bet) return;
        if (!confirm(`Resolve "${bet.label}" → Winner: "${bet.choices[choiceIndex]}"?`)) return;
        const res = await fetch(`${CHAT_URL}/admin/bet/resolve`, { method: "POST", headers, body: JSON.stringify({ betId, winningChoice: choiceIndex }) });
        const d = await res.json();
        if (res.ok) { flash(`Resolved! ${d.winnersCount} winner(s), pool: ${d.totalPool} coins`); fetchAll(); }
        else flash(d.error, true);
    };

    // ── Login Screen ──
    if (!authed) {
        return (
            <div className="admin-login-page">
                <div className="admin-login-box">
                    <div className="admin-login-icon">
                        <img src="/Logo.svg" alt="Signal24 Logo" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
                    </div>
                    <h1>Signal24 Admin</h1>
                    <p>Enter the admin key to continue</p>
                    <form onSubmit={handleLogin}>
                        <input type="password" placeholder="Admin Key" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} className="admin-input" autoFocus />
                        <button type="submit" className="admin-btn admin-btn-primary">Access Panel</button>
                    </form>
                    {error && <p className="admin-error">{error}</p>}
                    <a href="/" className="admin-back-link">← Back to Signal24</a>
                </div>
            </div>
        );
    }

    // ── Admin Panel ──
    return (
        <div className="admin-page">
            {/* Sidebar Nav */}
            <nav className="admin-nav">
                <div className="admin-nav-brand">
                    <span className="admin-brand-icon">⚡</span>
                    <span>Signal24</span>
                </div>
                {[
                    { id: "dashboard", icon: "📊", label: "Dashboard" },
                    { id: "users", icon: "👥", label: "Users" },
                    { id: "bets", icon: "🎲", label: "Bets" },
                ].map((item) => (
                    <button key={item.id} className={`admin-nav-item ${activeSection === item.id ? "admin-nav-active" : ""}`} onClick={() => setActiveSection(item.id)}>
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
                <div className="admin-nav-bottom">
                    <a href="/" className="admin-nav-item">
                        <span>🏠</span><span>Back to Site</span>
                    </a>
                </div>
            </nav>

            {/* Main Content */}
            <main className="admin-main">
                {/* Flash messages */}
                {msg && <div className="admin-flash admin-flash-ok">{msg}</div>}
                {error && <div className="admin-flash admin-flash-err">{error}</div>}

                {/* DASHBOARD */}
                {activeSection === "dashboard" && stats && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">Dashboard</h2>
                        <div className="admin-stats-grid">
                            {[
                                { label: "Users", value: stats.totalUsers, icon: "👥", color: "#4895ef" },
                                { label: "Online Now", value: stats.onlineNow, icon: "🟢", color: "#2dc653" },
                                { label: "Bets Placed", value: stats.totalBetsPlaced, icon: "🎯", color: "#f9a826" },
                                { label: "Total Pool", value: `${stats.totalPool} coins`, icon: "💰", color: "#e63946" },
                                { label: "Open Bets", value: stats.openBets, icon: "📈", color: "#a855f7" },
                                { label: "Resolved", value: stats.resolvedBets, icon: "✅", color: "#06b6d4" },
                            ].map((s) => (
                                <div key={s.label} className="admin-stat-card">
                                    <span className="admin-stat-icon" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</span>
                                    <div>
                                        <div className="admin-stat-value">{s.value}</div>
                                        <div className="admin-stat-label">{s.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* USERS */}
                {activeSection === "users" && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">User Management</h2>

                        {/* Add User */}
                        <div className="admin-card">
                            <h3 className="admin-card-title">Add User</h3>
                            <form className="admin-form-row" onSubmit={addUser}>
                                <input placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="admin-input" required />
                                <input placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="admin-input" required />
                                <input type="number" placeholder="Balance" value={newUser.balance} onChange={(e) => setNewUser({ ...newUser, balance: Number(e.target.value) })} className="admin-input admin-input-sm" />
                                <button type="submit" className="admin-btn admin-btn-primary">Add</button>
                            </form>
                        </div>

                        {/* Top Up */}
                        <div className="admin-card">
                            <h3 className="admin-card-title">Top Up User</h3>
                            <form className="admin-form-row" onSubmit={topUpUser}>
                                <input placeholder="Username" value={topUpForm.username} onChange={(e) => setTopUpForm({ ...topUpForm, username: e.target.value })} className="admin-input" required />
                                <input type="number" placeholder="Amount" value={topUpForm.amount} onChange={(e) => setTopUpForm({ ...topUpForm, amount: e.target.value })} className="admin-input admin-input-sm" required />
                                <button type="submit" className="admin-btn admin-btn-green">Top Up</button>
                            </form>
                        </div>

                        {/* User List */}
                        <div className="admin-card">
                            <h3 className="admin-card-title">All Users ({users.length})</h3>
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Balance</th>
                                            <th>Bets</th>
                                            <th>Role</th>
                                            <th>Joined</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.username}>
                                                <td className="admin-td-user">{u.username}</td>
                                                <td><span className="admin-badge admin-badge-amber">{u.balance}</span></td>
                                                <td>{u.totalBets}</td>
                                                <td>{u.isAdmin ? <span className="admin-badge admin-badge-red">Admin</span> : <span className="admin-badge admin-badge-dim">User</span>}</td>
                                                <td className="admin-td-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    {!u.isAdmin && (
                                                        <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => removeUser(u.username)}>Remove</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* BETS */}
                {activeSection === "bets" && (
                    <div className="admin-section">
                        <h2 className="admin-section-title">Bet Management</h2>

                        {/* Add Bet */}
                        <div className="admin-card">
                            <h3 className="admin-card-title">Add New Bet</h3>
                            <form className="admin-form-col" onSubmit={addBet}>
                                <div className="admin-form-row">
                                    <input placeholder="Category (e.g. Escalation Bets)" value={newBet.category} onChange={(e) => setNewBet({ ...newBet, category: e.target.value })} className="admin-input" required />
                                    <input placeholder="ID (e.g. new-bet-1)" value={newBet.id} onChange={(e) => setNewBet({ ...newBet, id: e.target.value })} className="admin-input" required />
                                </div>
                                <div className="admin-form-row">
                                    <input placeholder="Label" value={newBet.label} onChange={(e) => setNewBet({ ...newBet, label: e.target.value })} className="admin-input" required style={{ flex: 2 }} />
                                    <input placeholder="Icon" value={newBet.icon} onChange={(e) => setNewBet({ ...newBet, icon: e.target.value })} className="admin-input admin-input-xs" />
                                </div>
                                <input placeholder="Choices (comma-separated, e.g. Yes, No)" value={newBet.choices} onChange={(e) => setNewBet({ ...newBet, choices: e.target.value })} className="admin-input" required />
                                <button type="submit" className="admin-btn admin-btn-primary">Add Bet</button>
                            </form>
                        </div>

                        {/* Bet Categories */}
                        {bets.map((cat) => (
                            <div key={cat.category} className="admin-card">
                                <h3 className="admin-card-title">{cat.category} <span className="admin-card-tag">{cat.tag}</span></h3>
                                {cat.bets.map((bet) => (
                                    <div key={bet.id} className={`admin-bet-row ${bet.status === "resolved" ? "admin-bet-resolved" : ""}`}>
                                        <div className="admin-bet-info">
                                            <span className="admin-bet-icon">{bet.icon}</span>
                                            <div>
                                                <span className="admin-bet-label">{bet.label}</span>
                                                <span className="admin-bet-meta">
                                                    {bet.status === "resolved" ? `✅ Resolved → ${bet.choices[bet.winner]}` : `🟢 Open`}
                                                    {" · "}{bet.voters} voter{bet.voters !== 1 ? "s" : ""}
                                                    {" · Pool: "}{bet.totalPool} coins
                                                </span>
                                            </div>
                                        </div>
                                        <div className="admin-bet-choices">
                                            {bet.choices.map((ch, ci) => (
                                                <div key={ci} className="admin-bet-choice-row">
                                                    <span className="admin-bet-choice-name">{ch}</span>
                                                    <span className="admin-bet-choice-count">{bet.counts[ci] || 0}</span>
                                                    <span className="admin-bet-choice-odds">{bet.odds[ci] || "—"}x</span>
                                                    {bet.status === "open" && (
                                                        <button className="admin-btn admin-btn-xs admin-btn-green" onClick={() => resolveBet(bet.id, ci)}>
                                                            Winner
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="admin-bet-actions">
                                            <button className="admin-btn admin-btn-danger admin-btn-xs" onClick={() => removeBet(bet.id)}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
