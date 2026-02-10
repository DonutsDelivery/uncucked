import { userAvatarUrl, formatTimestamp } from '../../utils/cdn.js';
import { parseMarkdown } from '../../utils/markdown.js';
import Attachment from './Attachment.jsx';
import Embed from './Embed.jsx';

export default function Message({ message, isGrouped }) {
  const displayName = message.globalName || message.authorUsername;

  if (isGrouped) {
    return (
      <div className="px-4 py-[1px] hover:bg-black/[.06] group relative pl-[72px]">
        <span className="absolute left-0 top-[5px] text-[11px] text-discord-muted opacity-0 group-hover:opacity-100 w-[56px] text-right">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>

        {message.content && (
          <div
            className="text-discord-text leading-[1.375rem] break-words"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        )}

        <Attachments attachments={message.attachments} />
        <Embeds embeds={message.embeds} />
      </div>
    );
  }

  return (
    <div className="px-4 mt-[1.0625rem] pb-0 hover:bg-black/[.06] flex gap-4 relative">
      <img
        src={userAvatarUrl(message.authorId, message.authorAvatar, 80)}
        alt={displayName}
        className="w-10 h-10 rounded-full shrink-0 mt-0.5 cursor-pointer"
      />

      <div className="min-w-0 flex-1">
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
            className="text-discord-text leading-[1.375rem] break-words"
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
