import { PermissionFlagsBits, ChannelType } from 'discord.js';

// Check if the bot can view a channel (meaning web clients can too)
export function canBotViewChannel(channel) {
  if (!channel.guild) return false;
  const me = channel.guild.members.me;
  if (!me) return false;
  return channel.permissionsFor(me).has(PermissionFlagsBits.ViewChannel);
}

// Get all text channels the bot can see in a guild
export function getAccessibleChannels(guild) {
  return guild.channels.cache
    .filter(ch => {
      if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement) return false;
      return canBotViewChannel(ch);
    })
    .sort((a, b) => a.position - b.position);
}

// Check if a channel is NSFW
export function isNsfwChannel(channel) {
  return channel.nsfw === true;
}

// Check if the bot can manage webhooks in a channel
export function canManageWebhooks(channel) {
  const me = channel.guild.members.me;
  if (!me) return false;
  return channel.permissionsFor(me).has(PermissionFlagsBits.ManageWebhooks);
}

// Check if bot can send messages (needed for webhook fallback)
export function canSendMessages(channel) {
  const me = channel.guild.members.me;
  if (!me) return false;
  return channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages);
}

// Get channels grouped by category
export function getChannelsByCategory(guild) {
  const accessible = getAccessibleChannels(guild);
  const categories = new Map();
  const uncategorized = [];

  accessible.forEach(channel => {
    if (channel.parentId) {
      const parent = guild.channels.cache.get(channel.parentId);
      if (!categories.has(channel.parentId)) {
        categories.set(channel.parentId, {
          id: channel.parentId,
          name: parent?.name || 'Unknown',
          position: parent?.position ?? 999,
          channels: [],
        });
      }
      categories.get(channel.parentId).channels.push(channel);
    } else {
      uncategorized.push(channel);
    }
  });

  const sorted = [...categories.values()].sort((a, b) => a.position - b.position);

  if (uncategorized.length) {
    sorted.unshift({ id: null, name: null, position: -1, channels: uncategorized });
  }

  return sorted;
}
