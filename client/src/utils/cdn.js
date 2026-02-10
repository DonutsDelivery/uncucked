export function guildIconUrl(guildId, iconHash, size = 64) {
  if (!iconHash) return null;
  const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}

export function userAvatarUrl(userId, avatarHash, size = 64) {
  if (!avatarHash) {
    const index = (BigInt(userId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}

export function memberAvatarUrl(guildId, userId, avatarHash, size = 64) {
  if (!avatarHash) return null;
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${avatarHash}.${ext}?size=${size}`;
}

export function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;

  // Same week — show day name
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays < 7) {
    const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });
    return `${dayName} at ${time}`;
  }

  // Same year — omit year
  if (d.getFullYear() === now.getFullYear()) {
    const date = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    return `${date} at ${time}`;
  }

  return `${d.toLocaleDateString()} ${time}`;
}
