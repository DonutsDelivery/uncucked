// Format a discord.js message into our relay format
export function formatMessage(msg) {
  return {
    id: msg.id,
    channelId: msg.channelId,
    guildId: msg.guildId,
    authorId: msg.author.id,
    authorUsername: msg.author.username,
    authorAvatar: msg.author.avatar,
    authorBot: msg.author.bot,
    authorColor: msg.member?.displayHexColor !== '#000000' ? msg.member?.displayHexColor : null,
    globalName: msg.author.globalName || null,
    content: msg.content,
    attachments: msg.attachments.map(a => ({
      id: a.id,
      filename: a.name,
      url: a.url,
      proxyURL: a.proxyURL,
      size: a.size,
      contentType: a.contentType,
      width: a.width,
      height: a.height,
    })),
    embeds: msg.embeds.map(e => ({
      title: e.title,
      description: e.description,
      url: e.url,
      color: e.color,
      timestamp: e.timestamp,
      footer: e.footer ? { text: e.footer.text, iconURL: e.footer.iconURL } : null,
      image: e.image ? { url: e.image.url, proxyURL: e.image.proxyURL, width: e.image.width, height: e.image.height } : null,
      thumbnail: e.thumbnail ? { url: e.thumbnail.url, proxyURL: e.thumbnail.proxyURL } : null,
      author: e.author ? { name: e.author.name, url: e.author.url, iconURL: e.author.iconURL } : null,
      fields: e.fields || [],
    })),
    referenceId: msg.reference?.messageId || null,
    editedAt: msg.editedTimestamp,
    createdAt: msg.createdTimestamp,
    isWebhook: msg.webhookId != null,
    webhookSenderId: null, // Set by webhook handler when we know the sender
  };
}

// Attach relay listeners to a single discord.js Client
export function setupRelayForClient(client, io) {
  client.on('messageCreate', (msg) => {
    if (!msg.guild) return;
    const formatted = formatMessage(msg);
    io.to(`channel:${msg.channelId}`).emit('message:create', formatted);
  });

  client.on('messageUpdate', (oldMsg, newMsg) => {
    if (!newMsg.guild) return;
    if (!newMsg.author) return;
    const formatted = formatMessage(newMsg);
    io.to(`channel:${newMsg.channelId}`).emit('message:update', formatted);
  });

  client.on('messageDelete', (msg) => {
    if (!msg.guild) return;
    io.to(`channel:${msg.channelId}`).emit('message:delete', {
      id: msg.id,
      channelId: msg.channelId,
    });
  });

  client.on('typingStart', (typing) => {
    if (!typing.guild) return;
    io.to(`channel:${typing.channel.id}`).emit('typing:start', {
      channelId: typing.channel.id,
      userId: typing.user.id,
      username: typing.user.username,
      avatar: typing.user.avatar,
    });
  });
}

// Set up relay for all bots in the manager
export function setupDiscordRelay(botManager, io) {
  for (const client of botManager.getAllClients()) {
    setupRelayForClient(client, io);
  }
  console.log('[relay] Discord event relay initialized for all bots');
}
