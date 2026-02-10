# uncucked

A Discord web client that works through a relay bot — bypassing Discord's age verification and NSFW channel restrictions. Self-hostable, open source.

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

Your browser talks to the Express server, which talks to Discord through a bot. Messages, channels, members — everything flows through the relay. You authenticate with Discord OAuth2, and the bot reads/sends messages on your behalf via webhooks (matching your name and avatar).

## Features

- **OAuth2 Login** — Sign in with your real Discord account
- **Real-time Messages** — Live message streaming via Socket.IO
- **Webhook Sending** — Messages appear with your name and avatar
- **NSFW Channels** — Age gate that you control, not Discord
- **Member List** — See who's online in each channel
- **File Uploads** — Send images and attachments
- **Markdown Rendering** — Bold, italic, code blocks, spoilers, etc.
- **Embeds & Attachments** — Full embed rendering, image/video previews
- **Guild Switching** — Access any server the bot is in

## Prerequisites

- **Node.js** 18+
- A **Discord Application** with a bot (see setup below)

## Setup

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
   - Add a redirect URL: `http://localhost:3001/auth/callback` (or your server URL)

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

## Tech Stack

- **Server:** Node.js, Express, Socket.IO, discord.js, sql.js (SQLite)
- **Client:** React, Vite, Socket.IO client
- **Auth:** Discord OAuth2 + JWT sessions

## License

MIT
