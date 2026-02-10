import { useState, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import FileUploadPreview from './FileUploadPreview.jsx';

export default function MessageInput({ channelId }) {
  const { socket } = useSocket();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const sendMessage = useCallback(async () => {
    if ((!text.trim() && !files.length) || !socket || sending) return;

    setSending(true);

    try {
      // If we have files, encode them as base64 for socket transport
      const fileData = await Promise.all(
        files.map(f => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            buffer: Array.from(new Uint8Array(reader.result)),
            originalname: f.name,
            mimetype: f.type,
            size: f.size,
          });
          reader.readAsArrayBuffer(f);
        }))
      );

      socket.emit('message:send', {
        channelId,
        content: text.trim(),
        files: fileData,
      }, (res) => {
        if (res?.error) {
          console.error('Send failed:', res.error);
        }
        setSending(false);
      });

      setText('');
      setFiles([]);
    } catch (err) {
      console.error('Send error:', err);
      setSending(false);
    }
  }, [text, files, socket, channelId, sending]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          setFiles(prev => [...prev, file]);
        }
      }
    }
  }

  function handleFileSelect(e) {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="px-4 pb-6 shrink-0">
      {files.length > 0 && (
        <FileUploadPreview files={files} onRemove={removeFile} />
      )}

      <div className="bg-discord-light rounded-lg flex items-end">
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-discord-lightest hover:text-discord-text transition-colors shrink-0"
          title="Upload file"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={`Message #${channelId ? 'channel' : ''}`}
          className="flex-1 bg-transparent text-discord-text placeholder-discord-lighter py-3 px-1 resize-none max-h-[200px] outline-none text-sm"
          rows={1}
          disabled={sending}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
          }}
        />

        {/* Send button */}
        {(text.trim() || files.length > 0) && (
          <button
            onClick={sendMessage}
            disabled={sending}
            className="p-3 text-discord-blurple hover:text-discord-blurple/80 transition-colors shrink-0 disabled:opacity-50"
            title="Send message"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
