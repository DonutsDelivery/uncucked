import { useRef, useEffect, useCallback } from 'react';
import Message from './Message.jsx';

export default function MessageList({ messages, loading, hasMore, onLoadMore }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const shouldAutoScroll = useRef(true);

  // Auto-scroll on new messages
  useEffect(() => {
    if (shouldAutoScroll.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initial scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView();
    }
  }, [messages.length === 0]); // Re-run when channel changes (messages reset)

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check if near bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    shouldAutoScroll.current = nearBottom;

    // Load more when near top
    if (el.scrollTop < 200 && hasMore && !loading) {
      const prevHeight = el.scrollHeight;
      onLoadMore().then(() => {
        // Preserve scroll position after prepending
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [hasMore, loading, onLoadMore]);

  // Group consecutive messages from same author within 7 minutes
  const grouped = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const isGrouped = prev
      && prev.authorId === msg.authorId
      && (msg.createdAt - prev.createdAt) < 7 * 60 * 1000
      && !msg.referenceId;

    grouped.push({ ...msg, isGrouped });
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {loading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-discord-lightest">Loading messages...</div>
        </div>
      )}

      {hasMore && messages.length > 0 && (
        <div className="text-center py-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-discord-lightest text-sm hover:text-white transition-colors"
          >
            {loading ? 'Loading...' : 'Load more messages'}
          </button>
        </div>
      )}

      <div className="pb-4">
        {grouped.map(msg => (
          <Message key={msg.id} message={msg} isGrouped={msg.isGrouped} />
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
