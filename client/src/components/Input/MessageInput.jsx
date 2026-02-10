import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import FileUploadPreview from './FileUploadPreview.jsx';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB Discord bot/webhook limit

const MessageInput = forwardRef(function MessageInput({ channelId }, ref) {
  const { socket } = useSocket();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  function filterFiles(newFiles) {
    const tooLarge = [];
    const valid = [];
    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) {
        tooLarge.push(f.name);
      } else {
        valid.push(f);
      }
    }
    if (tooLarge.length) {
      setError(`File${tooLarge.length > 1 ? 's' : ''} too large (10MB limit): ${tooLarge.join(', ')}`);
      setTimeout(() => setError(null), 5000);
    }
    return valid;
  }

  // Reset sending state if socket disconnects mid-send
  useEffect(() => {
    if (!socket) return;
    const reset = () => setSending(false);
    socket.on('disconnect', reset);
    return () => socket.off('disconnect', reset);
  }, [socket]);

  useImperativeHandle(ref, () => ({
    addFiles(newFiles) {
      const valid = filterFiles(Array.from(newFiles));
      if (valid.length) setFiles(prev => [...prev, ...valid]);
    },
  }));

  const sendMessage = useCallback(async () => {
    if ((!text.trim() && !files.length) || !socket || sending) return;

    setSending(true);

    try {
      // If we have files, encode them as base64 for socket transport
      const fileData = await Promise.all(
        files.map(f => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            buffer: reader.result,
            originalname: f.name,
            mimetype: f.type,
            size: f.size,
          });
          reader.readAsArrayBuffer(f);
        }))
      );

      const sendTimeout = setTimeout(() => setSending(false), 15000);

      socket.emit('message:send', {
        channelId,
        content: text.trim(),
        files: fileData,
      }, (res) => {
        clearTimeout(sendTimeout);
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

    const pasted = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) pasted.push(file);
      }
    }
    if (pasted.length) {
      const valid = filterFiles(pasted);
      if (valid.length) setFiles(prev => [...prev, ...valid]);
    }
  }

  function handleFileSelect(e) {
    const valid = filterFiles(Array.from(e.target.files || []));
    if (valid.length) setFiles(prev => [...prev, ...valid]);
    e.target.value = '';
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="px-4 pb-6 shrink-0">
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <FileUploadPreview files={files} onRemove={removeFile} />
      )}

      <div className="bg-discord-input rounded-lg flex items-end">
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-discord-channels-default hover:text-discord-text transition-colors shrink-0"
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
          className="flex-1 bg-transparent text-discord-text placeholder-discord-lighter py-[11px] px-1 resize-none max-h-[200px] outline-none text-base leading-[1.375rem]"
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
});

export default MessageInput;
