import { useRef, useCallback } from 'react';
import Message from './Message.jsx';

function formatDateDivider(date) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function isSameDay(ts1, ts2) {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

export default function MessageList({ messages, loading, hasMore, onLoadMore }) {
  const containerRef = useRef(null);
  const loadingMore = useRef(false);

  // Reset loadingMore when messages update after a load
  if (loadingMore.current && messages.length > 0) {
    loadingMore.current = false;
  }

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    // In column-reverse, scrollTop is 0 at bottom and negative going up.
    // Load more when user scrolls near the top (most negative scrollTop).
    const scrolledUp = el.scrollHeight + el.scrollTop - el.clientHeight;
    if (
      !loadingMore.current &&
      scrolledUp < 200 &&
      hasMore &&
      !loading
    ) {
      loadingMore.current = true;
      onLoadMore();
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

    // Check if we need a date divider
    const needsDivider = i === 0 || (prev && !isSameDay(prev.createdAt, msg.createdAt));

    grouped.push({ ...msg, isGrouped: needsDivider ? false : isGrouped, needsDivider });
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto flex flex-col-reverse"
    >
      {/* This inner div un-reverses the content so messages display top-to-bottom */}
      <div>
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-discord-muted">Loading messages...</div>
          </div>
        )}

        {hasMore && messages.length > 0 && (
          <div className="text-center py-4">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="text-discord-muted text-sm hover:text-white transition-colors"
            >
              {loading ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}

        <div className="pb-6">
          {grouped.map(msg => (
            <div key={msg.id}>
              {msg.needsDivider && (
                <DateDivider timestamp={msg.createdAt} />
              )}
              <Message message={msg} isGrouped={msg.isGrouped} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DateDivider({ timestamp }) {
  return (
    <div className="flex items-center mx-4 mt-6 mb-2">
      <div className="flex-1 h-px bg-discord-light" />
      <span className="px-2 text-xs font-semibold text-discord-muted">
        {formatDateDivider(timestamp)}
      </span>
      <div className="flex-1 h-px bg-discord-light" />
    </div>
  );
}
