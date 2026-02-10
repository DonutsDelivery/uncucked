export default function Embed({ embed }) {
  const borderColor = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#1e1f22';

  return (
    <div
      className="rounded-md overflow-hidden max-w-[520px] bg-discord-dark"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="p-3">
        {/* Author */}
        {embed.author && (
          <div className="flex items-center gap-2 mb-1">
            {embed.author.iconURL && (
              <img src={embed.author.iconURL} alt="" className="w-5 h-5 rounded-full" />
            )}
            {embed.author.url ? (
              <a href={embed.author.url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium text-white hover:underline">
                {embed.author.name}
              </a>
            ) : (
              <span className="text-sm font-medium text-white">{embed.author.name}</span>
            )}
          </div>
        )}

        {/* Title */}
        {embed.title && (
          <div className="mb-1">
            {embed.url ? (
              <a href={embed.url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-[#00aff4] hover:underline">
                {embed.title}
              </a>
            ) : (
              <div className="text-sm font-semibold text-white">{embed.title}</div>
            )}
          </div>
        )}

        {/* Description */}
        {embed.description && (
          <div className="text-sm text-discord-text leading-relaxed mb-2">
            {embed.description}
          </div>
        )}

        {/* Fields */}
        {embed.fields?.length > 0 && (
          <div className="grid gap-y-1 gap-x-2 mb-2" style={{
            gridTemplateColumns: `repeat(${Math.min(embed.fields.filter(f => f.inline).length || 1, 3)}, 1fr)`,
          }}>
            {embed.fields.map((field, i) => (
              <div key={i} className={field.inline ? '' : 'col-span-full'}>
                <div className="text-xs font-semibold text-discord-lightest">{field.name}</div>
                <div className="text-sm text-discord-text">{field.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Thumbnail */}
        {embed.thumbnail && (
          <img
            src={embed.thumbnail.proxyURL || embed.thumbnail.url}
            alt=""
            className="float-right w-20 h-20 rounded-md object-cover ml-4"
            loading="lazy"
          />
        )}

        {/* Image */}
        {embed.image && (
          <img
            src={embed.image.proxyURL || embed.image.url}
            alt=""
            className="rounded-md max-w-full mt-2"
            loading="lazy"
          />
        )}

        {/* Footer */}
        {embed.footer && (
          <div className="flex items-center gap-2 mt-2">
            {embed.footer.iconURL && (
              <img src={embed.footer.iconURL} alt="" className="w-4 h-4 rounded-full" />
            )}
            <span className="text-xs text-discord-lighter">{embed.footer.text}</span>
            {embed.timestamp && (
              <>
                <span className="text-xs text-discord-lighter">•</span>
                <span className="text-xs text-discord-lighter">
                  {new Date(embed.timestamp).toLocaleString()}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
