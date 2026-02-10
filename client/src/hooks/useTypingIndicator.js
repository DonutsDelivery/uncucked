import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export function useTypingIndicator(channelId, currentUserId) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState([]);
  const timeoutsRef = useRef(new Map());
  const lastEmitRef = useRef(0);

  // Listen for typing events
  useEffect(() => {
    if (!socket || !channelId) return;

    const handleTyping = ({ userId, username, avatar }) => {
      // Ignore own typing
      if (userId === currentUserId) return;

      setTypingUsers(prev => {
        const exists = prev.find(u => u.userId === userId);
        if (!exists) {
          return [...prev, { userId, username, avatar }];
        }
        return prev;
      });

      // Clear existing timeout for this user
      if (timeoutsRef.current.has(userId)) {
        clearTimeout(timeoutsRef.current.get(userId));
      }

      // Auto-expire after 8 seconds
      const timeout = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        timeoutsRef.current.delete(userId);
      }, 8000);

      timeoutsRef.current.set(userId, timeout);
    };

    socket.on('typing:start', handleTyping);

    return () => {
      socket.off('typing:start', handleTyping);
      // Clear all timeouts on cleanup
      for (const timeout of timeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      timeoutsRef.current.clear();
    };
  }, [socket, channelId, currentUserId]);

  // Reset typing users when channel changes
  useEffect(() => {
    setTypingUsers([]);
    for (const timeout of timeoutsRef.current.values()) {
      clearTimeout(timeout);
    }
    timeoutsRef.current.clear();
  }, [channelId]);

  // Throttled typing emitter (max once per 3s)
  const emitTyping = useCallback(() => {
    if (!socket || !channelId) return;
    const now = Date.now();
    if (now - lastEmitRef.current < 3000) return;
    lastEmitRef.current = now;
    socket.emit('typing:start', { channelId });
  }, [socket, channelId]);

  return { typingUsers, emitTyping };
}
