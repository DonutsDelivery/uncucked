import { useEffect, useRef } from 'react';

export default function EmojiAutocomplete({ suggestions, onSelect, selectedIndex = 0 }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex];
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!suggestions.length) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-discord-dark border border-discord-lighter/20 rounded-lg shadow-lg overflow-hidden z-50 max-h-[300px] overflow-y-auto"
    >
      {suggestions.map((emoji, i) => (
        <button
          key={emoji.id}
          className={`w-full px-3 py-1.5 flex items-center gap-2 text-sm text-discord-text hover:bg-discord-blurple/30 ${
            i === selectedIndex ? 'bg-discord-blurple/20' : ''
          }`}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent textarea blur
            onSelect(emoji);
          }}
        >
          <span className="text-lg">{emoji.native}</span>
          <span className="text-discord-muted">:{emoji.id}:</span>
        </button>
      ))}
    </div>
  );
}
