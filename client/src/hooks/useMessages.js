import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export function useMessages(channelId) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const joinedRef = useRef(null);

  // Fetch initial messages and join channel
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessages([]);
      setHasMore(true);

      try {
        const res = await fetch(`/api/channels/${channelId}/messages?limit=50`, {
          credentials: 'include',
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.code === 'NSFW_GATE') {
            setMessages([]);
            setLoading(false);
            return 'NSFW_GATE';
          }
          throw new Error(data.error);
        }

        const data = await res.json();
        if (!cancelled) {
          setMessages(data);
          setHasMore(data.length >= 50);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Join socket room
    if (socket?.connected) {
      socket.emit('channel:join', { channelId }, (res) => {
        if (res?.error) console.error('Failed to join channel:', res.error);
      });
      joinedRef.current = channelId;
    }

    load();

    return () => {
      cancelled = true;
      if (socket?.connected && joinedRef.current) {
        socket.emit('channel:leave', { channelId: joinedRef.current });
        joinedRef.current = null;
      }
    };
  }, [channelId, socket]);

  // Re-join channel room on socket reconnect
  useEffect(() => {
    if (!socket || !channelId) return;

    function onReconnect() {
      socket.emit('channel:join', { channelId }, (res) => {
        if (res?.error) console.error('Failed to rejoin channel:', res.error);
      });
      joinedRef.current = channelId;
    }

    socket.on('connect', onReconnect);
    return () => socket.off('connect', onReconnect);
  }, [socket, channelId]);

  // Listen for real-time events
  useEffect(() => {
    if (!socket || !channelId) return;

    function onMessageCreate(msg) {
      if (msg.channelId !== channelId) return;
      setMessages(prev => {
        // Dedup check
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }

    function onMessageUpdate(msg) {
      if (msg.channelId !== channelId) return;
      setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
    }

    function onMessageDelete({ id }) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }

    socket.on('message:create', onMessageCreate);
    socket.on('message:update', onMessageUpdate);
    socket.on('message:delete', onMessageDelete);

    return () => {
      socket.off('message:create', onMessageCreate);
      socket.off('message:update', onMessageUpdate);
      socket.off('message:delete', onMessageDelete);
    };
  }, [socket, channelId]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!channelId || loading || !hasMore || !messages.length) return;

    const oldest = messages[0];
    setLoading(true);

    try {
      const res = await fetch(
        `/api/channels/${channelId}/messages?limit=50&before=${oldest.id}`,
        { credentials: 'include' }
      );
      const data = await res.json();

      setMessages(prev => [...data, ...prev]);
      setHasMore(data.length >= 50);
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId, loading, hasMore, messages]);

  return { messages, loading, hasMore, loadMore };
}
