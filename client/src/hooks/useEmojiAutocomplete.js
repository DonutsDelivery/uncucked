import { useMemo } from 'react';
import data from '@emoji-mart/data';

// Build a flat searchable list from emoji-mart data
const emojiList = (() => {
  const list = [];
  for (const [id, emoji] of Object.entries(data.emojis)) {
    list.push({
      id,
      name: emoji.name,
      skins: emoji.skins,
      keywords: emoji.keywords || [],
    });
  }
  return list;
})();

export function useEmojiAutocomplete(text, selectionStart) {
  return useMemo(() => {
    if (!text || selectionStart == null) {
      return { suggestions: [], query: '', matchStart: -1 };
    }

    // Find the `:keyword` pattern before cursor
    const before = text.slice(0, selectionStart);
    const match = before.match(/:([a-zA-Z0-9_+-]{2,})$/);
    if (!match) {
      return { suggestions: [], query: '', matchStart: -1 };
    }

    const query = match[1].toLowerCase();
    const matchStart = before.length - match[0].length;

    // Search for matches
    const results = [];
    for (const emoji of emojiList) {
      if (results.length >= 8) break;
      const matchesId = emoji.id.includes(query);
      const matchesName = emoji.name.toLowerCase().includes(query);
      const matchesKeyword = emoji.keywords.some(k => k.includes(query));
      if (matchesId || matchesName || matchesKeyword) {
        results.push({
          id: emoji.id,
          name: emoji.name,
          native: emoji.skins[0]?.native,
        });
      }
    }

    return { suggestions: results, query, matchStart };
  }, [text, selectionStart]);
}
