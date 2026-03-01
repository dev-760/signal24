<p align="center">
  <img src="public/Logo.svg" width="80" alt="Signal24 Logo" />
</p>

<h1 align="center">Signal24</h1>

<p align="center">
  <strong>Real-time live news stream aggregator with live chat, user accounts, and The Conflict League</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#license">License</a>
</p>

---

## 💡 Why I Built This

During major breaking news events, I found myself constantly switching between dozens of browser tabs — CNN, BBC, Al Jazeera, local channels — trying to piece together what was actually happening from different perspectives. It was chaotic and inefficient.

**Signal24** solves this by putting every live news stream on a single page in a clean, no-nonsense interface. No sign-ups for viewing, no ads, no clutter — just live video feeds from global news networks, a breaking news ticker, and a complete suite of interactive tools:

- **Live Chat:** Real-time synchronized chat rooms alongside the feeds.
- **The Conflict League:** A fully-fledged betting ecosystem where users top up accounts and predict global escalation events.
- **Admin Command Center:** A hidden control panel for managing users, resolving bets, and tracking live global traffic metrics.

The name "Signal24" means **signal, 24 hours a day** — because the news never stops.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Multi-stream grid** | Watch 12+ live news channels simultaneously in a 1/2/3 column layout |
| **Breaking news ticker** | Auto-scrolling headline bar with pause-on-hover |
| **Real-time Live Chat** | WebSockets-powered global chat room for active discussions |
| **Secure Authentication** | Built-in login/signup flows using **bcrypt** hashed passwords |
| **Database Persistence** | Fully backed by **Supabase (PostgreSQL)** — zero data loss |
| **The Conflict League** | 13 multi-choice geopolitical prediction markets across 5 categories |
| **Live Economy** | Users start with 100 coins, bet 10 at a time, and get auto-payouts |
| **Admin Panel** | Hidden dashboard to add/remove users, top up balances, and resolve bets |
| **Performance Analytics** | Pre-configured with **Vercel Analytics & Speed Insights** for SEO |
| **Modern UX** | Dark theme, glassmorphism, compact inline forms, accordion menus |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend UI** | [Next.js 16](https://nextjs.org/) (React 19, App Router) |
| **WebSockets** | [Socket.IO](https://socket.io/) (Client and Server) |
| **Database** | [Supabase](https://supabase.com/) & PostgreSQL |
| **Backend API** | [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) |
| **Security** | `bcrypt` hashing middleware |
| **Video Delivery** | [hls.js](https://github.com/video-dev/hls.js/) + YouTube iframes |
| **Analytics** | `@vercel/analytics` + `@vercel/speed-insights` |

---

## 🚀 Getting Started Locally

### Prerequisites

- Node.js 18+ installed
- A free account on [Supabase](https://supabase.com/)

### 1. Installation

```bash
git clone https://github.com/dev-760/signal24.git
cd signal24
npm install
```

### 2. Database Setup
1. Create a new project in Supabase.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase-schema.sql` from this project, paste it into the SQL editor, and click **Run**.
4. Retrieve your **Project URL** and **anon / public key**.

### 3. Environment Config
The project comes with two configuration templates (`.env.vercel` and `.env.render`). Run this command locally for testing:
```bash
cp .env.render .env.local
```
Edit `.env.local` to include your Supabase keys from Step 2.

### 4. Running the Dev Servers

```bash
# Terminal 1 — Start the local Express & Socket backend
npm run chat

# Terminal 2 — Start the Next.js frontend UI
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Deployment Guide

Signal24 employs a modern split-architecture microservice pattern. It requires deploying the Backend and Frontend to separate free-tier providers.

### Phase 1: Deploy Backend (Render)
1. Go to [Render](https://render.com) > **New Web Service** > **Connect GitHub Repo**.
2. Configure as a **Node** environment.
3. Set the **Build Command**:
   ```bash
   npm install express socket.io @supabase/supabase-js bcrypt dotenv
   ```
4. Set the **Start Command**:
   ```bash
   node server.js
   ```
5. Add the variables from `.env.render` into the Render **Environment Variables** UI.
6. Click **Deploy**. *Copy the generated URL (e.g. `https://signal24-api.onrender.com`)*.

### Phase 2: Deploy Frontend (Vercel)
1. Go to [Vercel](https://vercel.com) > **Add New Project** > **Connect GitHub Repo**.
2. Vercel automatically detects Next.js configurations.
3. Before clicking deploy, expand the **Environment Variables** menu and paste exactly the ones outlined in the `.env.vercel` file.
   - For `NEXT_PUBLIC_CHAT_URL`, paste the Render URL you copied in Phase 1.
4. Click **Deploy**.

> **Important Finalizer**: Take the URL Vercel just gave you (e.g., `https://signal24.vercel.app`) and place it safely in your Render dashboard under the `ALLOWED_ORIGINS` variable to connect the CORS handshake. Re-deploy Render.

---

## 👑 Accessing the Admin Panel

The Admin Panel routes and configurations are hidden securely behind the UI.

1. Once deployed, open the website and locate the pulsing red **"LIVE"** badge at the top right of the navigation bar.
2. Click directly on the word **LIVE**.
3. You will be prompted for an Admin Key. Enter:
   - `signal24admin`
4. From here you can natively edit databases, calculate payouts directly to active users, manage websocket traffic, and view Vercel analytics triggers.

---

## 📁 Project Structure

```bash
signal24/
├── app/
│   ├── admin/               # Secure Control Panel Routes
│   ├── components/          # React layout elements
│   ├── globals.css          # Vanilla UI tokens and layout grids
│   └── page.js              # Core UI injection layer
├── server.js                # Master Websocket & API Server
├── supabase-schema.sql      # Supabase PG Initialization query
├── .env.render              # Backend Environment blueprint
├── .env.vercel              # Frontend Environment blueprint
└── package.json             # Build definitions
```

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/dev-760">dev-760</a>
</p>