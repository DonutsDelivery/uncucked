import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import config from './config.js';
import { initDatabase, getAllBots, addBot, removeBot } from './database.js';
import authRouter from './auth.js';
import { authenticateJWT, requireAgeVerification, authenticateSocket } from './middleware.js';
import { setupDiscordRelay, setupRelayForClient, formatMessage } from './discord-relay.js';
import { setupSocketHandlers } from './socket-handler.js';
import { getChannelsByCategory, canBotViewChannel, isNsfwChannel, canManageWebhooks, canUserReadHistory, canUserSendMessages } from './permissions.js';
import { BotManager } from './bot-manager.js';

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
  maxHttpBufferSize: 10e6, // 10MB — match Discord bot/webhook file size limit
});

// Bot manager (replaces single discordClient)
const botManager = new BotManager();

// Middleware
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// File upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (Discord bot/webhook limit)
});

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Too many requests' } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many requests' } });

// Auth routes
app.use('/api/auth', authLimiter, authRouter);

// ---- Protected API routes ----
app.use('/api', apiLimiter);

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

    // Collect guilds from all bots, deduplicate by guild ID
    const seen = new Set();
    const guilds = [];
    for (const client of botManager.getAllClients()) {
      for (const [id, g] of client.guilds.cache) {
        if (userGuildIds.has(id) && !seen.has(id)) {
          seen.add(id);
          guilds.push({
            id: g.id,
            name: g.name,
            icon: g.icon,
            memberCount: g.memberCount,
          });
        }
      }
    }

    res.json(guilds);
  } catch (err) {
    console.error('Failed to fetch mutual guilds:', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Get channels for a guild
app.get('/api/guilds/:guildId/channels', authenticateJWT, async (req, res) => {
  const guild = botManager.findGuild(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const member = await botManager.fetchMember(req.params.guildId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member of this guild' });

  const categories = getChannelsByCategory(guild, member);

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
  const channel = botManager.findChannel(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  if (!canBotViewChannel(channel)) return res.status(403).json({ error: 'No access' });

  const member = await botManager.fetchMember(channel.guild.id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member of this guild' });
  if (!canUserReadHistory(channel, member)) return res.status(403).json({ error: 'No access to this channel' });

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
app.get('/api/guilds/:guildId/info', authenticateJWT, async (req, res) => {
  const guild = botManager.findGuild(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const member = await botManager.fetchMember(req.params.guildId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member of this guild' });

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
  const guild = botManager.findGuild(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const member = await botManager.fetchMember(req.params.guildId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member of this guild' });

  try {
    const members = await guild.members.list({ limit: 1000 });
    const formatted = members.map(m => ({
      id: m.user.id,
      username: m.user.username,
      globalName: m.user.globalName || null,
      nickname: m.nickname,
      avatar: m.user.avatar,
      guildAvatar: m.avatar, // per-server avatar hash
      bot: m.user.bot,
      roles: m.roles.cache
        .filter(r => r.id !== guild.id) // exclude @everyone
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor !== '#000000' ? r.hexColor : null, position: r.position })),
      highestRoleColor: m.displayHexColor !== '#000000' ? m.displayHexColor : null,
      isOwner: m.id === guild.ownerId,
    }));

    // Sort: owner first, then by highest role position descending, then alphabetical
    formatted.sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      const aPos = a.roles[0]?.position ?? -1;
      const bPos = b.roles[0]?.position ?? -1;
      if (aPos !== bPos) return bPos - aPos;
      return (a.nickname || a.globalName || a.username).localeCompare(b.nickname || b.globalName || b.username);
    });

    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Check webhook permission for a channel
app.get('/api/channels/:channelId/can-send', authenticateJWT, async (req, res) => {
  const channel = botManager.findChannel(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  const member = await botManager.fetchMember(channel.guild.id, req.user.id);
  const canSend = canManageWebhooks(channel) && !!member && canUserSendMessages(channel, member);

  res.json({
    canSend,
    nsfw: isNsfwChannel(channel),
  });
});

// ---- Admin API routes ----

function requireAdmin(req, res, next) {
  if (!config.adminUserId) return res.status(403).json({ error: 'Admin not configured' });
  if (req.user.id !== config.adminUserId) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// List registered bots
app.get('/api/admin/bots', adminLimiter, authenticateJWT, requireAdmin, (req, res) => {
  const bots = [];
  for (const [botId, client] of botManager.clients) {
    // Skip primary bot
    if (botId === config.discord.clientId) continue;
    bots.push({
      botId,
      name: client.user?.tag || 'Unknown',
      guildCount: client.guilds.cache.size,
    });
  }
  res.json(bots);
});

// Add a new bot
app.post('/api/admin/bots', adminLimiter, authenticateJWT, requireAdmin, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    // Temporarily login to extract bot info
    const { Client, GatewayIntentBits } = await import('discord.js');
    const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] });
    await tempClient.login(token);

    const botId = tempClient.user.id;
    const botName = tempClient.user.tag;

    // Destroy temp client — we'll create the real one via BotManager
    tempClient.destroy();

    // Check not already registered
    if (botManager.clients.has(botId)) {
      return res.status(409).json({ error: 'Bot already registered' });
    }

    // Add via bot manager (full intents)
    const client = await botManager.add(botId, token);
    setupRelayForClient(client, io);

    // Save to DB
    addBot(token, botId, botName, req.user.userId);

    console.log(`[admin] Bot ${botName} (${botId}) added by ${req.user.userId}`);
    res.json({ botId, name: botName, guildCount: client.guilds.cache.size });
  } catch (err) {
    console.error('[admin] Failed to add bot:', err);
    res.status(400).json({ error: 'Failed to add bot' });
  }
});

// Remove a bot
app.delete('/api/admin/bots/:botId', adminLimiter, authenticateJWT, requireAdmin, async (req, res) => {
  const { botId } = req.params;

  // Don't allow removing the primary bot
  if (botId === config.discord.clientId) {
    return res.status(400).json({ error: 'Cannot remove primary bot' });
  }

  if (!botManager.clients.has(botId)) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  await botManager.remove(botId);
  removeBot(botId);

  console.log(`[admin] Bot ${botId} removed by ${req.user.userId}`);
  res.json({ success: true });
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

  // Login primary bot
  console.log('[discord] Logging in primary bot...');
  const primaryClient = await botManager.add(config.discord.clientId, config.discord.token);
  console.log(`[discord] Primary bot: ${primaryClient.user.tag} — ${primaryClient.guilds.cache.size} guilds`);

  // Load registered bots from DB
  const registeredBots = getAllBots();
  for (const bot of registeredBots) {
    try {
      await botManager.add(bot.bot_id, bot.bot_token);
    } catch (err) {
      console.error(`[discord] Failed to login registered bot ${bot.bot_name || bot.bot_id}:`, err.message);
    }
  }

  const totalGuilds = botManager.getAllClients().reduce((sum, c) => sum + c.guilds.cache.size, 0);
  console.log(`[discord] ${botManager.clients.size} bot(s) active, ${totalGuilds} total guilds`);

  // Set up relay and socket handlers
  setupDiscordRelay(botManager, io);
  setupSocketHandlers(io, botManager);

  httpServer.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
    console.log(`[server] Client URL: ${config.clientUrl}`);
  });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
