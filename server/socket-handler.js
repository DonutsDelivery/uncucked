import { canBotViewChannel, isNsfwChannel, canUserViewChannel, canUserSendMessages } from './permissions.js';
import { sendAsUser } from './webhooks.js';

export function setupSocketHandlers(io, botManager) {
  io.on('connection', (socket) => {
    console.log(`[socket] ${socket.user.username} connected`);

    // Join a channel room
    socket.on('channel:join', async ({ channelId }, callback) => {
      try {
        console.log(`[socket] channel:join ${channelId} by ${socket.user.username} (${socket.user.id})`);
        const channel = botManager.findChannel(channelId);
        if (!channel) { console.log('[socket] channel:join - channel not found'); return callback?.({ error: 'Channel not found' }); }
        if (!canBotViewChannel(channel)) { console.log('[socket] channel:join - bot no access'); return callback?.({ error: 'No access' }); }

        const member = await botManager.fetchMember(channel.guild.id, socket.user.id);
        console.log(`[socket] channel:join - fetchMember result: ${member ? member.user.tag : 'null'}`);
        if (!member) return callback?.({ error: 'Not a member of this guild' });
        if (!canUserViewChannel(channel, member)) { console.log('[socket] channel:join - user no view permission'); return callback?.({ error: 'No access to this channel' }); }

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
        console.log(`[socket] message:send to ${channelId} by ${socket.user.username} (${socket.user.id})`);
        const channel = botManager.findChannel(channelId);
        if (!channel) return callback?.({ error: 'Channel not found' });
        if (!canBotViewChannel(channel)) return callback?.({ error: 'No access' });

        const member = await botManager.fetchMember(channel.guild.id, socket.user.id);
        console.log(`[socket] message:send - fetchMember result: ${member ? member.user.tag : 'null'}`);
        if (!member) return callback?.({ error: 'Not a member of this guild' });
        if (!canUserSendMessages(channel, member)) { console.log('[socket] message:send - user no send permission'); return callback?.({ error: 'No permission to send messages in this channel' }); }

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

    socket.on('disconnect', (reason) => {
      console.log(`[socket] ${socket.user.username} disconnected — reason: ${reason}`);
    });
  });
}
