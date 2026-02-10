import { getCachedWebhook, cacheWebhook } from './database.js';
import { canManageWebhooks } from './permissions.js';

const WEBHOOK_NAME = 'Relay Hook';

// Rate limit: 5 messages per second per channel (200ms spacing)
const channelQueues = new Map();

async function getOrCreateWebhook(channel) {
  // Check cache first
  const cached = getCachedWebhook(channel.id);
  if (cached) {
    try {
      // Verify it still exists
      const wh = await channel.client.fetchWebhook(cached.webhook_id);
      if (wh) return wh;
    } catch {
      // Webhook was deleted, create new one
    }
  }

  if (!canManageWebhooks(channel)) {
    throw new Error('Bot lacks ManageWebhooks permission in this channel');
  }

  // Check for existing relay webhook
  const webhooks = await channel.fetchWebhooks();
  let webhook = webhooks.find(w => w.name === WEBHOOK_NAME && w.owner?.id === channel.client.user.id);

  if (!webhook) {
    webhook = await channel.createWebhook({ name: WEBHOOK_NAME });
  }

  cacheWebhook(channel.id, webhook.id, webhook.token);
  return webhook;
}

export async function sendAsUser(channel, user, content, files = []) {
  const webhook = await getOrCreateWebhook(channel);

  const avatarURL = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`;

  const displayName = user.globalName || user.username;

  // Queue the send with rate limiting
  return enqueue(channel.id, async () => {
    return webhook.send({
      content: content || undefined,
      username: displayName,
      avatarURL,
      files: files.map(f => ({
        attachment: f.buffer,
        name: f.originalname,
      })),
    });
  });
}

function enqueue(channelId, fn) {
  if (!channelQueues.has(channelId)) {
    channelQueues.set(channelId, { queue: [], processing: false });
  }

  const q = channelQueues.get(channelId);

  return new Promise((resolve, reject) => {
    q.queue.push({ fn, resolve, reject });
    processQueue(channelId);
  });
}

async function processQueue(channelId) {
  const q = channelQueues.get(channelId);
  if (!q || q.processing || !q.queue.length) return;

  q.processing = true;

  while (q.queue.length) {
    const { fn, resolve, reject } = q.queue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (err) {
      reject(err);
    }
    // 200ms spacing between sends
    if (q.queue.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  q.processing = false;

  // Clean up empty queues after a while
  setTimeout(() => {
    const q = channelQueues.get(channelId);
    if (q && !q.queue.length && !q.processing) {
      channelQueues.delete(channelId);
    }
  }, 10000);
}
