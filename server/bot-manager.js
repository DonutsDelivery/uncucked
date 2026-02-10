import { Client, GatewayIntentBits, Partials } from 'discord.js';

const BOT_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageTyping,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

const BOT_PARTIALS = [Partials.Message, Partials.Channel];

const MEMBER_CACHE_TTL = 5 * 60 * 1000; // 5min for successful fetches
const MEMBER_FAIL_TTL = 60 * 1000;      // 1min for failed fetches

export class BotManager {
  constructor() {
    this.clients = new Map(); // botId -> Client
    this.memberCache = new Map(); // "guildId:userId" -> { member, fetchedAt, failed }
  }

  async fetchMember(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const cached = this.memberCache.get(key);
    if (cached) {
      const ttl = cached.failed ? MEMBER_FAIL_TTL : MEMBER_CACHE_TTL;
      if (Date.now() - cached.fetchedAt < ttl) {
        return cached.failed ? null : cached.member;
      }
    }

    const guild = this.findGuild(guildId);
    if (!guild) return null;

    try {
      const member = await guild.members.fetch(userId);
      this.memberCache.set(key, { member, fetchedAt: Date.now(), failed: false });
      return member;
    } catch {
      this.memberCache.set(key, { member: null, fetchedAt: Date.now(), failed: true });
      return null;
    }
  }

  invalidateMember(guildId, userId) {
    this.memberCache.delete(`${guildId}:${userId}`);
  }

  async add(botId, token) {
    if (this.clients.has(botId)) {
      throw new Error(`Bot ${botId} is already registered`);
    }

    const client = new Client({
      intents: BOT_INTENTS,
      partials: BOT_PARTIALS,
    });

    await client.login(token);
    this.clients.set(botId, client);
    console.log(`[bot-manager] Added bot ${client.user.tag} (${botId}) — ${client.guilds.cache.size} guilds`);
    return client;
  }

  async remove(botId) {
    const client = this.clients.get(botId);
    if (!client) return;

    console.log(`[bot-manager] Removing bot ${client.user?.tag || botId}`);
    client.destroy();
    this.clients.delete(botId);
  }

  getClient(botId) {
    return this.clients.get(botId);
  }

  getAllClients() {
    return [...this.clients.values()];
  }

  findGuild(guildId) {
    for (const client of this.clients.values()) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) return guild;
    }
    return null;
  }

  findChannel(channelId) {
    for (const client of this.clients.values()) {
      const channel = client.channels.cache.get(channelId);
      if (channel) return channel;
    }
    return null;
  }
}
