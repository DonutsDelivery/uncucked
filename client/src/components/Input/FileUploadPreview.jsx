function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadPreview({ files, onRemove }) {
  return (
    <div className="flex gap-2 p-2 bg-discord-light rounded-t-lg border-b border-discord-medium overflow-x-auto">
      {files.map((file, i) => {
        const isImage = file.type.startsWith('image/');
        const url = isImage ? URL.createObjectURL(file) : null;

        return (
          <div key={i} className="relative bg-discord-dark rounded-lg p-2 min-w-[120px] max-w-[200px] shrink-0">
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 bg-discord-red text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-discord-red/80"
            >
              ×
            </button>

            {isImage && url ? (
              <img src={url} alt={file.name} className="w-full h-20 object-cover rounded mb-1" />
            ) : (
              <div className="w-full h-20 flex items-center justify-center">
                <svg className="w-8 h-8 text-discord-lightest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            <div className="text-xs text-discord-lightest truncate">{file.name}</div>
            <div className="text-[10px] text-discord-lighter">{formatSize(file.size)}</div>
          </div>
        );
      })}
    </div>
  );
}
