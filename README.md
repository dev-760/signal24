<p align="center">
  <img src="public/Logo.svg" width="80" alt="Signal24 Logo" />
</p>

<h1 align="center">Signal24</h1>

<p align="center">
  <strong>Real-time live news stream aggregator with live chat & war predictions</strong>
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

**Signal24** solves this by putting every live news stream on a single page in a clean, no-nonsense interface. No sign-ups, no ads, no clutter — just live video feeds from global news networks, a breaking news ticker, and a live chat room so you can discuss what's happening with other viewers in real time.

The name "Signal24" means **signal, 24 hours a day** — because the news never stops.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Multi-stream grid** | Watch 12+ live news channels simultaneously in a 1/2/3 column grid |
| **Scroll-snap card view** | Single-column mode with swipeable card navigation and dot indicators |
| **Breaking news ticker** | Auto-scrolling headline bar with pause-on-hover |
| **Live chat** | Real-time chat powered by WebSockets — talk with other viewers |
| **The Conflict League** | 13 war prediction bets across 5 categories — escalation, economic, international, diplomacy, long-term outcomes |
| **User accounts** | Login / Sign up with username and password — votes and chat are tied to your account |
| **Mute/Unmute toggle** | One-click audio control — only one channel plays audio at a time |
| **Fullscreen mode** | Expand any channel to fullscreen with a single click |
| **Responsive design** | Works on desktop, tablet, and mobile |
| **Dark theme** | Premium dark UI with glassmorphism effects |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | [Next.js 16](https://nextjs.org/) (React 19, App Router, Turbopack) |
| **Video** | [hls.js](https://github.com/video-dev/hls.js/) for HLS streams, YouTube iframes |
| **Chat Server** | [Express](https://expressjs.com/) + [Socket.IO](https://socket.io/) |
| **Styling** | Vanilla CSS with custom design tokens |
| **Fonts** | Plus Jakarta Sans + JetBrains Mono (Google Fonts) |
| **Deployment** | Vercel (frontend) + Render (chat server) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/dev-760/signal24.git
cd signal24

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values (see below)
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CHAT_URL` | ✅ | Chat server URL. Use `http://localhost:3001` for local dev |
| `GNEWS_API_KEY` | ❌ | [GNews API](https://gnews.io/) key for live headlines |
| `CURRENTS_API_KEY` | ❌ | [Currents API](https://currentsapi.services/) key (fallback) |

> **Note:** The ticker works without API keys — it falls back to built-in headlines.

### Running Locally

```bash
# Terminal 1 — Start the Next.js frontend
npm run dev

# Terminal 2 — Start the chat server
npm run chat
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment

Signal24 has two parts that need to be deployed separately:

| Service | Platform | What it runs |
|---|---|---|
| **Frontend** (Next.js) | [Vercel](https://vercel.com) | The website UI |
| **Chat Server** (Express + Socket.IO) | [Render](https://render.com) | WebSocket chat backend |

### Step 1: Deploy the Chat Server on Render

1. Go to [render.com](https://render.com) and sign up / log in

2. Click **New** → **Web Service**

3. Connect your GitHub repo or use **Public Git Repository**:
   ```
   https://github.com/dev-760/signal24.git
   ```

4. Configure the service:
   | Setting | Value |
   |---|---|
   | **Name** | `signal24-chat` |
   | **Runtime** | Node |
   | **Build Command** | `npm install express socket.io` |
   | **Start Command** | `node chat-server.js` |
   | **Plan** | Free |

5. Add environment variables:
   | Key | Value |
   |---|---|
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (add your Vercel URL after deploying) |

6. Click **Deploy Web Service**

7. Once deployed, copy the service URL (e.g. `https://signal24-chat.onrender.com`)

> **Tip:** The free tier on Render spins down after 15 minutes of inactivity. The first request may take ~30 seconds to wake up.

### Step 2: Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / log in

2. Click **Add New** → **Project**

3. Import your GitHub repository

4. Vercel auto-detects Next.js — no build settings needed

5. Add environment variables:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_CHAT_URL` | `https://signal24-chat.onrender.com` (your Render URL from Step 1) |
   | `GNEWS_API_KEY` | Your GNews API key (optional) |
   | `CURRENTS_API_KEY` | Your Currents API key (optional) |

6. Click **Deploy**

### Step 3: Connect Them Together

After both services are deployed:

1. **Copy your Vercel URL** (e.g. `https://signal24.vercel.app`)

2. **Go to Render Dashboard** → your `signal24-chat` service → **Environment**

3. **Update `ALLOWED_ORIGINS`** to your Vercel URL:
   ```
   https://signal24.vercel.app
   ```
   > For multiple origins, separate with commas: `https://signal24.vercel.app,https://custom-domain.com`

4. **Redeploy** the Render service for the change to take effect

5. ✅ **Done!** Your live chat should now work on your deployed site.

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   USERS                         │
│              (Web Browsers)                     │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
┌───────────────┐   ┌────────────────┐
│   Vercel      │   │   Render       │
│   (Frontend)  │   │ (Chat Server)  │
│               │   │                │
│  Next.js App  │◄──│  Express +     │
│  + API Routes │   │  Socket.IO     │
│               │   │                │
│  Port: 443    │   │  Port: 3001    │
└───────────────┘   └────────────────┘
        │
        ▼
  HLS Video Streams
  (External CDNs)
```

---

## 📁 Project Structure

```
signal24/
├── app/
│   ├── api/headlines/       # News headlines API route
│   ├── components/
│   │   ├── ChannelCard.js   # Individual channel card
│   │   ├── ExpandedView.js  # Fullscreen modal
│   │   ├── Header.js        # Sticky header with clock
│   │   ├── LiveChat.js      # Chat sidebar + war betting
│   │   ├── NewsTicker.js    # Breaking news ticker
│   │   └── VideoPlayer.js   # HLS/iframe video player
│   ├── data/channels.js     # Channel list & headlines
│   ├── globals.css          # Design system & styles
│   ├── layout.js            # Root layout + fonts
│   └── page.js              # Main page
├── public/
│   └── Logo.svg             # App logo
├── chat-server.js           # WebSocket chat server
├── render.yaml              # Render deployment config
├── .env.example             # Environment template
├── next.config.mjs          # Next.js configuration
└── package.json
```

---

## 📺 Channels

| Channel | Region | Type |
|---|---|---|
| ABC News Digital | USA | HLS |
| CNN | USA | HLS |
| LiveNOW from FOX | USA | HLS |
| BBC World News | UK | HLS |
| TRT World | Turkey | HLS |
| Al Jazeera Mubasher | Qatar | HLS |
| Sky News Arabia | UAE | HLS |
| RT Arabic | Russia | HLS |
| i24 News | Israel | HLS |
| IRIB News | Iran | HLS |
| Press TV | Iran | HLS |
| Al Arabiya | Saudi Arabia | HLS |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-channel`
3. Commit your changes: `git commit -m 'Add new channel'`
4. Push: `git push origin feature/new-channel`
5. Open a Pull Request

### Adding a New Channel

Add an entry to `app/data/channels.js`:

```js
{
    id: "channel-id",
    name: "Channel Name",
    region: "Country",
    url: "https://stream-url/playlist.m3u8",
    type: "hls",
    logo: "https://logo-url.png",
}
```

---

## 📄 License

This project is open source. All live streams are property of their respective broadcasters.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/dev-760">dev-760</a>
</p>