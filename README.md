# uncucked

A Discord web client that works through a relay bot — bypassing Discord's ID verification to access NSFW servers and instead complies with the global lawful requirement of confirming that you are over 18. Self-hostable, open source.
<img width="1195" height="953" alt="image" src="https://github.com/user-attachments/assets/ec80345c-ea16-4fed-8418-b674c144db32" />

## How It Works

```
┌─────────┐     WebSocket/HTTP      ┌─────────────┐    Discord API    ┌─────────┐
│  React   │◄──────────────────────►│   Express    │◄────────────────►│ Discord  │
│  Client  │   Socket.IO + REST     │   Server     │   discord.js     │   API    │
│ (Vite)   │                        │              │                  │          │
│          │   OAuth2 login          │  Bot token   │   Gateway +      │          │
│          │   JWT sessions          │  JWT auth    │   REST calls     │          │
│          │   Real-time msgs        │  Webhook     │   Message relay  │          │
│          │   File uploads          │  SQLite DB   │   File proxy     │          │
└─────────┘                         └─────────────┘                   └─────────┘
```

Your browser talks to the Express server, which talks to Discord through a bot. Messages, channels, members — everything flows through the relay. You authenticate with Discord OAuth2, and the bot reads/sends messages on your behalf via webhooks (matching your name and avatar). This is already how a lot of Discord <-> Matrix relays work.

## Features

- **OAuth2 Login** — Sign in with your real Discord account
- **Real-time Messages** — Live message streaming via Socket.IO
- **Webhook Sending** — Messages appear with your name and avatar
- **NSFW Channels** — Age-gated as required by law, no ID upload needed
- **Member List** — See who's online in each channel
- **File Uploads** — Send images and attachments
- **Markdown Rendering** — Bold, italic, code blocks, spoilers, etc.
- **Embeds & Attachments** — Full embed rendering, image/video previews
- **Guild Switching** — Access any server the bot is in

## Getting Started

### Option 0: Browser extension or userscript (no server needed)

Don't want to use a relay? Install the extension or userscript to unblock content directly on discord.com — no bot, no server, no proxy.

**Browser extension (recommended):**
1. **[Install from Chrome Web Store](#)** (Chrome, Brave, Edge) — one click, no setup
2. Open Discord — NSFW gates and content filters are gone

**Userscript alternative:**
1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Brave/Edge) or [Violentmonkey](https://violentmonkey.github.io/) (Firefox)
2. Enable **Developer mode** in `chrome://extensions` (Chromium browsers only — [why?](discord-unblock/#chromium-browsers-chrome-brave-edge))
3. **[Click here to install the userscript](https://raw.githubusercontent.com/DonutsDelivery/uncucked/main/discord-unblock/discord-unblock.user.js)** — your manager will prompt you
4. Open Discord — NSFW gates and content filters are gone

This patches Discord's client-side filters: strips explicit attachment flags, bypasses age gates, and auto-dismisses NSFW channel warnings. See [discord-unblock/](discord-unblock/) for details.

---

### Option 1: Just add the bot (easiest)

No hosting required. Add our bot to your Discord server and use it at **[uncucked.online](https://uncucked.online)**.

1. **[Add bot to your server](https://discord.com/oauth2/authorize?client_id=1470610846572089529&permissions=536947728&scope=bot)**
2. Go to **[uncucked.online](https://uncucked.online)** and log in with Discord
3. You'll see any server that both you and the bot are in

That's it. No setup, no server, no config. Your server admin just adds the bot and everyone connects at [uncucked.online](https://uncucked.online).

---

### Option 2: Add your own bot

Register your bot token on [uncucked.online](https://uncucked.online) — no self-hosting needed. Your bot's servers appear alongside the main bot's for all users who share those servers.

1. Create a Discord bot in the [Developer Portal](https://discord.com/developers/applications) (enable Message Content + Server Members intents)
2. Invite the bot to your servers
3. Contact the admin to register your bot token — your bot's servers will appear on uncucked.online

---

### Option 3: Fully self-hosted

Run everything yourself — your own server, your own domain, your own bot.

1. Set up your own server (see [Server Setup](#server-setup) below)
2. Point your domain to your server and set up SSL (Let's Encrypt + nginx)
3. Add `https://yourdomain.com/api/auth/callback` as a redirect URL in your Discord app

---

## Server Setup

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** tab:
   - Click **Reset Token** and save the token
   - Enable **Message Content Intent**
   - Enable **Server Members Intent**
   - Enable **Presence Intent**
4. Go to **OAuth2** tab:
   - Save the **Client ID** and **Client Secret**
   - Add a redirect URL: `http://localhost:3001/api/auth/callback` (and your production URL later)

### 2. Invite the Bot

Use this URL (replace `YOUR_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=536947728&scope=bot
```

The permissions integer `536947728` includes: Read Messages, Send Messages, Manage Webhooks, Attach Files, Read Message History, Add Reactions, Use External Emojis, and View Channels.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
PORT=3001
JWT_SECRET=change_this_to_a_random_string
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3001
```

### 4. Install & Run (Development)

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Run server (in one terminal)
npm run dev

# Run client (in another terminal)
npm run client
```

The client runs at `http://localhost:5173` and the server at `http://localhost:3001`.

### 5. Production Deployment

Build the client and serve it from Express:

```bash
cd client && npm run build && cd ..
npm start
```

The server will serve the built client from `client/dist/`. Set `CLIENT_URL` and `SERVER_URL` to your production domain.

**PM2 + nginx example:**

```bash
# Start with PM2
pm2 start server/index.js --name uncucked

# nginx reverse proxy
server {
    listen 80;
    server_name your.domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Environment Variables

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from Developer Portal |
| `DISCORD_CLIENT_ID` | OAuth2 client ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 client secret |
| `PORT` | Server port (default: 3001) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `CLIENT_URL` | Frontend URL for CORS/redirects |
| `SERVER_URL` | Backend URL for OAuth2 callback |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins for CORS (optional, defaults to CLIENT_URL) |
| `ADMIN_USER_ID` | Discord user ID for admin access (multi-bot management) |

## Tech Stack

- **Server:** Node.js, Express, Socket.IO, discord.js, sql.js (SQLite)
- **Client:** React, Vite, Socket.IO client
- **Auth:** Discord OAuth2 + JWT sessions

## License

MIT
