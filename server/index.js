import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import multer from 'multer';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import config from './config.js';
import { initDatabase } from './database.js';
import authRouter from './auth.js';
import { authenticateJWT, requireAgeVerification, authenticateSocket } from './middleware.js';
import { setupDiscordRelay, formatMessage } from './discord-relay.js';
import { setupSocketHandlers } from './socket-handler.js';
import { getChannelsByCategory, canBotViewChannel, isNsfwChannel, canManageWebhooks } from './permissions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

// Dynamic CORS — allow any origin in the ALLOWED_ORIGINS list
function corsOrigin(origin, callback) {
  // Allow requests with no origin (mobile apps, curl, same-origin)
  if (!origin) return callback(null, true);
  if (config.allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
}

// Socket.io
const io = new SocketServer(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
});

// Discord client
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Middleware
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// File upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB (Discord limit)
});

// Auth routes
app.use('/api/auth', authRouter);

// ---- Protected API routes ----

// Get mutual guilds (servers both the user and bot are in)
app.get('/api/guilds', authenticateJWT, async (req, res) => {
  try {
    // Fetch user's guilds from Discord using their OAuth token
    const userGuildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${req.user.accessToken}` },
    });

    if (!userGuildsRes.ok) {
      // Token might be expired, try refreshing
      const { refreshDiscordToken } = await import('./auth.js');
      const newToken = await refreshDiscordToken(req.user.id);
      if (newToken) {
        const retry = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retry.ok) return res.status(502).json({ error: 'Failed to fetch user guilds' });
        var userGuilds = await retry.json();
      } else {
        return res.status(401).json({ error: 'Discord token expired' });
      }
    } else {
      var userGuilds = await userGuildsRes.json();
    }

    const userGuildIds = new Set(userGuilds.map(g => g.id));

    // Filter bot guilds to only those the user is also in
    const guilds = discordClient.guilds.cache
      .filter(g => userGuildIds.has(g.id))
      .map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        memberCount: g.memberCount,
      }));

    res.json(guilds);
  } catch (err) {
    console.error('Failed to fetch mutual guilds:', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Get channels for a guild
app.get('/api/guilds/:guildId/channels', authenticateJWT, (req, res) => {
  const guild = discordClient.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const categories = getChannelsByCategory(guild);

  const result = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    channels: cat.channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      nsfw: ch.nsfw,
      topic: ch.topic,
      type: ch.type,
    })),
  }));

  res.json(result);
});

// Get messages for a channel
app.get('/api/channels/:channelId/messages', authenticateJWT, async (req, res) => {
  const channel = discordClient.channels.cache.get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  if (!canBotViewChannel(channel)) return res.status(403).json({ error: 'No access' });

  if (isNsfwChannel(channel) && !req.user.ageVerified) {
    return res.status(403).json({ error: 'Age verification required', code: 'NSFW_GATE' });
  }

  const { before, limit = 50 } = req.query;

  try {
    // Fetch from Discord API
    const options = { limit: Math.min(parseInt(limit), 100) };
    if (before) options.before = before;

    const messages = await channel.messages.fetch(options);
    const formatted = messages.map(m => formatMessage(m)).reverse();
    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(502).json({ error: 'Failed to fetch messages from Discord' });
  }
});

// File upload endpoint
app.post('/api/upload', authenticateJWT, upload.array('files', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files' });
  // Files are in memory, return metadata. Actual sending happens via socket.
  const files = req.files.map(f => ({
    originalname: f.originalname,
    size: f.size,
    mimetype: f.mimetype,
  }));
  res.json({ files });
});

// Guild info
app.get('/api/guilds/:guildId/info', authenticateJWT, (req, res) => {
  const guild = discordClient.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  res.json({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
  });
});

// Get members for a guild
app.get('/api/guilds/:guildId/members', authenticateJWT, async (req, res) => {
  const guild = discordClient.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  try {
    const members = await guild.members.list({ limit: 1000 });
    const formatted = members.map(m => ({
      id: m.user.id,
      username: m.user.username,
      globalName: m.user.globalName || null,
      nickname: m.nickname,
      avatar: m.user.avatar,
      bot: m.user.bot,
      roles: m.roles.cache
        .filter(r => r.id !== guild.id) // exclude @everyone
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor !== '#000000' ? r.hexColor : null })),
      highestRoleColor: m.displayHexColor !== '#000000' ? m.displayHexColor : null,
      isOwner: m.id === guild.ownerId,
    }));

    // Sort: owner first, then by highest role position, then alphabetical
    formatted.sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      // Compare highest role position (already sorted in roles array)
      const aTop = a.roles[0]?.name || '';
      const bTop = b.roles[0]?.name || '';
      if (aTop !== bTop) return aTop.localeCompare(bTop);
      return (a.nickname || a.globalName || a.username).localeCompare(b.nickname || b.globalName || b.username);
    });

    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Check webhook permission for a channel
app.get('/api/channels/:channelId/can-send', authenticateJWT, (req, res) => {
  const channel = discordClient.channels.cache.get(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  res.json({
    canSend: canManageWebhooks(channel),
    nsfw: isNsfwChannel(channel),
  });
});

// Serve built React app in production
const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Socket.io auth
io.use(authenticateSocket);

// SPA catch-all - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// ---- Start everything ----
async function start() {
  console.log('[db] Initializing database...');
  await initDatabase();

  console.log('[discord] Logging in...');
  await discordClient.login(config.discord.token);
  console.log(`[discord] Logged in as ${discordClient.user.tag}`);
  console.log(`[discord] In ${discordClient.guilds.cache.size} guilds`);

  // Set up relay and socket handlers
  setupDiscordRelay(discordClient, io);
  setupSocketHandlers(io, discordClient);

  httpServer.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
    console.log(`[server] Client URL: ${config.clientUrl}`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
