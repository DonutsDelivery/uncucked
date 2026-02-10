import { userAvatarUrl, formatTimestamp } from '../../utils/cdn.js';
import { parseMarkdown, isEmojiOnly } from '../../utils/markdown.js';
import Attachment from './Attachment.jsx';
import Embed from './Embed.jsx';

// System message types from Discord API
const SYSTEM_TYPES = {
  7: 'join',      // Member join
  8: 'boost',     // Server boost
  9: 'boost_t1',  // Boost tier 1
  10: 'boost_t2', // Boost tier 2
  11: 'boost_t3', // Boost tier 3
};

export default function Message({ message, isGrouped, onReply }) {
  const displayName = message.globalName || message.authorUsername;

  // System messages (joins, boosts, etc.)
  if (SYSTEM_TYPES[message.type]) {
    return <SystemMessage message={message} type={SYSTEM_TYPES[message.type]} />;
  }

  const jumbo = isEmojiOnly(message.content);
  const contentClass = `text-discord-text leading-[1.375rem] break-words${jumbo ? ' jumbo-emoji' : ''}`;

  if (isGrouped) {
    return (
      <div className="px-4 py-[1px] hover:bg-white/[.02] group relative pl-[72px]">
        <span className="absolute left-0 top-[5px] text-[11px] text-discord-muted opacity-0 group-hover:opacity-100 w-[56px] text-right">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>

        <MessageActions onReply={() => onReply?.(message)} />

        {message.content && (
          <div
            className={contentClass}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        )}

        <Attachments attachments={message.attachments} />
        <Embeds embeds={message.embeds} />
      </div>
    );
  }

  return (
    <div className="px-4 mt-[1.0625rem] pb-0 hover:bg-white/[.02] flex gap-4 relative group">
      <img
        src={userAvatarUrl(message.authorId, message.authorAvatar, 80)}
        alt={displayName}
        className="w-10 h-10 rounded-full shrink-0 mt-0.5 cursor-pointer"
      />

      <div className="min-w-0 flex-1">
        {message.referencedMessage && (
          <ReplyPreview ref_msg={message.referencedMessage} />
        )}
        {!message.referencedMessage && message.referenceId && (
          <div className="flex items-center gap-1 text-xs text-discord-muted mb-0.5 pl-0">
            <ReplyIcon className="w-3 h-3" />
            <span className="italic">Original message was deleted</span>
          </div>
        )}

        <MessageActions onReply={() => onReply?.(message)} />

        <div className="flex items-baseline gap-1">
          <span
            className="font-medium text-sm leading-[1.375rem] hover:underline cursor-pointer"
            style={{ color: message.authorColor || 'rgb(var(--dc-white))' }}
          >
            {displayName}
          </span>
          {message.authorBot && (
            <span className="text-[10px] bg-discord-blurple text-white px-[4.8px] py-[1px] rounded-sm font-medium leading-[15px] ml-1 align-baseline inline-flex items-center">
              BOT
            </span>
          )}
          <span className="text-xs text-discord-muted ml-1">
            {formatTimestamp(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-[10px] text-discord-muted" title={new Date(message.editedAt).toLocaleString()}>
              (edited)
            </span>
          )}
        </div>

        {message.content && (
          <div
            className={contentClass}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        )}

        <Attachments attachments={message.attachments} />
        <Embeds embeds={message.embeds} />
      </div>
    </div>
  );
}

function ReplyPreview({ ref_msg }) {
  const name = ref_msg.globalName || ref_msg.authorUsername;
  const content = ref_msg.content
    ? ref_msg.content.slice(0, 100)
    : 'Click to see attachment';

  return (
    <div className="flex items-center gap-1.5 text-xs mb-0.5 cursor-pointer hover:text-discord-text">
      <ReplyIcon className="w-3 h-3 text-discord-muted" />
      <img
        src={userAvatarUrl(ref_msg.authorId, ref_msg.authorAvatar, 16)}
        alt=""
        className="w-4 h-4 rounded-full"
      />
      <span
        className="font-medium text-sm leading-none"
        style={{ color: ref_msg.authorColor || 'rgb(var(--dc-white))' }}
      >
        {name}
      </span>
      <span className="text-discord-muted truncate">{content}</span>
    </div>
  );
}

function ReplyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 8.26667V4L3 11.4667L10 18.9333V14.56C15 14.56 18.5 16.2667 21 20C20 14.6667 17 9.33333 10 8.26667Z" />
    </svg>
  );
}

function MessageActions({ onReply }) {
  return (
    <div className="absolute -top-3.5 right-4 hidden group-hover:flex bg-discord-dark border border-discord-lighter/20 rounded shadow-sm z-10">
      <button
        onClick={onReply}
        className="p-1.5 text-discord-muted hover:text-discord-text transition-colors"
        title="Reply"
      >
        <ReplyIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function SystemMessage({ message, type }) {
  const displayName = message.globalName || message.authorUsername;

  let icon, text;
  if (type === 'join') {
    icon = (
      <svg className="w-4 h-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.893 4.182a.999.999 0 00-.393-.218 7.466 7.466 0 00-2-.273c-4.136 0-7.5 3.364-7.5 7.5 0 .98.189 1.916.534 2.774L4.182 19.317a.999.999 0 00.391 1.609 1 1 0 001.11-.292l5.352-5.352a7.466 7.466 0 002.774.534c4.136 0 7.5-3.364 7.5-7.5a7.466 7.466 0 00-.273-2 .999.999 0 00-1.692-.482L16.5 8.677l-1.177-1.177 2.843-2.843a.999.999 0 00-.273-.475z" />
      </svg>
    );
    text = <><strong className="text-discord-white hover:underline cursor-pointer">{displayName}</strong> joined the server</>;
  } else {
    icon = (
      <svg className="w-4 h-4 text-pink-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.001 2C10.682 2 9.603 3.076 9.603 4.394c0 .63.247 1.2.647 1.627L8.04 12.782l-2.73-1.582a2.394 2.394 0 00.086-.63c0-1.318-1.08-2.394-2.398-2.394S.6 9.252.6 10.57s1.08 2.394 2.398 2.394c.396 0 .77-.097 1.099-.268l3.474 2.013-3.474 2.013a2.39 2.39 0 00-1.1-.268C1.68 16.454.6 17.53.6 18.848S1.68 21.24 3 21.24s2.398-1.076 2.398-2.394c0-.224-.03-.44-.086-.644l2.73-1.582 2.21 6.762c.118.359.456.618.84.618h.82c.384 0 .722-.26.84-.618l2.21-6.762 2.73 1.582a2.394 2.394 0 00-.086.644c0 1.318 1.08 2.394 2.398 2.394s2.398-1.076 2.398-2.394-1.08-2.394-2.398-2.394a2.39 2.39 0 00-1.1.268l-3.473-2.013 3.474-2.013c.33.17.703.268 1.099.268 1.318 0 2.398-1.076 2.398-2.394s-1.08-2.394-2.398-2.394-2.398 1.076-2.398 2.394c0 .224.03.44.086.63l-2.73 1.582-2.21-6.762A.873.873 0 0012.842 6h-.001a2.39 2.39 0 00.762-1.606C13.6 3.076 12.52 2 11.201 2z" />
      </svg>
    );
    text = <><strong className="text-discord-white hover:underline cursor-pointer">{displayName}</strong> boosted the server</>;
  }

  return (
    <div className="px-4 py-1 flex items-center gap-2 text-sm text-discord-muted">
      {icon}
      <span>{text}</span>
      <span className="text-xs text-discord-muted ml-1">
        {formatTimestamp(message.createdAt)}
      </span>
    </div>
  );
}

function Attachments({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className="flex flex-col gap-1 mt-1">
      {attachments.map(att => (
        <Attachment key={att.id} attachment={att} />
      ))}
    </div>
  );
}

function Embeds({ embeds }) {
  if (!embeds?.length) return null;
  return (
    <div className="flex flex-col gap-1 mt-1">
      {embeds.map((embed, i) => (
        <Embed key={i} embed={embed} />
      ))}
    </div>
  );
}
