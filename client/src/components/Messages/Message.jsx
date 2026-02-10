import { userAvatarUrl, formatTimestamp } from '../../utils/cdn.js';
import { parseMarkdown } from '../../utils/markdown.js';
import Attachment from './Attachment.jsx';
import Embed from './Embed.jsx';

export default function Message({ message, isGrouped }) {
  const displayName = message.globalName || message.authorUsername;

  if (isGrouped) {
    return (
      <div className="px-4 py-0.5 hover:bg-discord-medium/50 group relative pl-[72px]">
        <span className="absolute left-4 top-1 text-[11px] text-discord-lighter opacity-0 group-hover:opacity-100 w-10 text-right">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>

        {message.content && (
          <div
            className="text-sm text-discord-text leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        )}

        <Attachments attachments={message.attachments} />
        <Embeds embeds={message.embeds} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-0.5 hover:bg-discord-medium/50 flex gap-4">
      <img
        src={userAvatarUrl(message.authorId, message.authorAvatar, 80)}
        alt={displayName}
        className="w-10 h-10 rounded-full shrink-0 mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-white text-sm hover:underline cursor-pointer">
            {displayName}
          </span>
          {message.authorBot && (
            <span className="text-[10px] bg-discord-blurple text-white px-1 rounded font-medium">
              BOT
            </span>
          )}
          <span className="text-xs text-discord-lighter">
            {formatTimestamp(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-[10px] text-discord-lighter">(edited)</span>
          )}
        </div>

        {message.content && (
          <div
            className="text-sm text-discord-text leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        )}

        <Attachments attachments={message.attachments} />
        <Embeds embeds={message.embeds} />
      </div>
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
