import { lazy, Suspense } from 'react';

const Picker = lazy(() => import('@emoji-mart/react'));
import data from '@emoji-mart/data';

export default function EmojiPicker({ onSelect }) {
  return (
    <Suspense fallback={<div className="w-[352px] h-[435px] bg-discord-dark rounded-lg" />}>
      <Picker
        data={data}
        onEmojiSelect={(emoji) => onSelect(emoji.native)}
        theme="dark"
        set="native"
        previewPosition="none"
        skinTonePosition="search"
        maxFrequentRows={2}
      />
    </Suspense>
  );
}
