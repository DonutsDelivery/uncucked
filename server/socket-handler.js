import { canBotViewChannel, isNsfwChannel } from './permissions.js';
import { sendAsUser } from './webhooks.js';

export function setupSocketHandlers(io, discordClient) {
  io.on('connection', (socket) => {
    console.log(`[socket] ${socket.user.username} connected`);

    // Join a channel room
    socket.on('channel:join', async ({ channelId }, callback) => {
      try {
        const channel = discordClient.channels.cache.get(channelId);
        if (!channel) return callback?.({ error: 'Channel not found' });
        if (!canBotViewChannel(channel)) return callback?.({ error: 'No access' });

        // NSFW check
        if (isNsfwChannel(channel) && !socket.user.ageVerified) {
          return callback?.({ error: 'Age verification required', code: 'NSFW_GATE' });
        }

        // Leave all other channel rooms
        for (const room of socket.rooms) {
          if (room.startsWith('channel:')) {
            socket.leave(room);
          }
        }

        socket.join(`channel:${channelId}`);
        socket.currentChannel = channelId;

        callback?.({ success: true });
      } catch (err) {
        console.error('[socket] channel:join error:', err);
        callback?.({ error: 'Failed to join channel' });
      }
    });

    // Leave channel room
    socket.on('channel:leave', ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
      if (socket.currentChannel === channelId) {
        socket.currentChannel = null;
      }
    });

    // Send a message via webhook
    socket.on('message:send', async ({ channelId, content, files }, callback) => {
      try {
        const channel = discordClient.channels.cache.get(channelId);
        if (!channel) return callback?.({ error: 'Channel not found' });
        if (!canBotViewChannel(channel)) return callback?.({ error: 'No access' });

        if (isNsfwChannel(channel) && !socket.user.ageVerified) {
          return callback?.({ error: 'Age verification required', code: 'NSFW_GATE' });
        }

        const webhookMsg = await sendAsUser(channel, socket.user, content, files || []);

        callback?.({ success: true, messageId: webhookMsg.id });
      } catch (err) {
        console.error('[socket] message:send error:', err);
        callback?.({ error: err.message || 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:start', {
        channelId,
        userId: socket.user.id,
        username: socket.user.username,
        avatar: socket.user.avatar,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] ${socket.user.username} disconnected`);
    });
  });
}
