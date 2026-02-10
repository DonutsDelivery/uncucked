import { useState } from 'react';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachment({ attachment }) {
  const [expanded, setExpanded] = useState(false);
  const isImage = attachment.contentType?.startsWith('image/');
  const isVideo = attachment.contentType?.startsWith('video/');
  const isAudio = attachment.contentType?.startsWith('audio/');

  const url = attachment.proxyURL || attachment.url;

  if (isImage) {
    const maxW = 400;
    const maxH = 300;
    let w = attachment.width || maxW;
    let h = attachment.height || maxH;
    const ratio = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);

    return (
      <div>
        <img
          src={url}
          alt={attachment.filename}
          width={w}
          height={h}
          className="rounded-md cursor-pointer max-w-full"
          onClick={() => setExpanded(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {expanded && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
            onClick={() => setExpanded(false)}
          >
            <img
              src={url}
              alt={attachment.filename}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={url}
        controls
        className="rounded-md max-w-[400px] max-h-[300px]"
        preload="metadata"
      />
    );
  }

  if (isAudio) {
    return (
      <audio src={url} controls className="max-w-[400px]" preload="metadata" />
    );
  }

  // Generic file
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-discord-dark rounded-md p-3 max-w-[400px] hover:bg-discord-darker transition-colors"
    >
      <svg className="w-6 h-6 text-discord-lightest shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <div className="min-w-0">
        <div className="text-sm text-discord-link truncate hover:underline">{attachment.filename}</div>
        <div className="text-xs text-discord-lighter">{formatFileSize(attachment.size)}</div>
      </div>
    </a>
  );
}
