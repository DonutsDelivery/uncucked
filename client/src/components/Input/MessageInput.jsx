import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import { useEmojiAutocomplete } from '../../hooks/useEmojiAutocomplete.js';
import FileUploadPreview from './FileUploadPreview.jsx';
import EmojiAutocomplete from './EmojiAutocomplete.jsx';
import EmojiPicker from './EmojiPicker.jsx';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB Discord bot/webhook limit

const MessageInput = forwardRef(function MessageInput({ channelId, onTyping, replyTo, onCancelReply }, ref) {
  const { socket } = useSocket();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const { suggestions, matchStart } = useEmojiAutocomplete(text, selectionStart);

  // Reset autocomplete index when suggestions change
  useEffect(() => {
    setAutocompleteIndex(0);
  }, [suggestions.length]);

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

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClick(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPicker]);

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
        replyTo: replyTo?.id || undefined,
      }, (res) => {
        clearTimeout(sendTimeout);
        if (res?.error) {
          console.error('Send failed:', res.error);
        }
        setSending(false);
      });

      setText('');
      setFiles([]);
      setShowEmojiPicker(false);
      onCancelReply?.();
    } catch (err) {
      console.error('Send error:', err);
      setSending(false);
    }
  }, [text, files, socket, channelId, sending, replyTo, onCancelReply]);

  function insertEmoji(emoji) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = text.slice(0, start) + emoji.native + text.slice(end);
    setText(newText);
    const newPos = start + emoji.native.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
      setSelectionStart(newPos);
    });
  }

  function insertAutocompleteEmoji(emoji) {
    const ta = textareaRef.current;
    if (!ta) return;
    // Replace from matchStart to cursor with emoji.native
    const newText = text.slice(0, matchStart) + emoji.native + text.slice(selectionStart);
    setText(newText);
    const newPos = matchStart + emoji.native.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
      setSelectionStart(newPos);
    });
  }

  function handleKeyDown(e) {
    // Autocomplete navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex(i => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        insertAutocompleteEmoji(suggestions[autocompleteIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectionStart(null);
        return;
      }
    }

    if (e.key === 'Escape' && showEmojiPicker) {
      setShowEmojiPicker(false);
      return;
    }

    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleChange(e) {
    setText(e.target.value);
    setSelectionStart(e.target.selectionStart);
    onTyping?.();
  }

  function handleSelect(e) {
    setSelectionStart(e.target.selectionStart);
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

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-discord-dark/50 rounded-t-lg border-b border-discord-lighter/10 text-sm">
          <span className="text-discord-muted">Replying to</span>
          <span className="text-discord-white font-medium">
            {replyTo.globalName || replyTo.authorUsername}
          </span>
          <button
            onClick={onCancelReply}
            className="ml-auto text-discord-muted hover:text-discord-text transition-colors"
            title="Cancel reply"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className={`bg-discord-input ${replyTo ? 'rounded-b-lg' : 'rounded-lg'} flex items-end relative`}>
        {/* Emoji autocomplete dropdown */}
        <EmojiAutocomplete
          suggestions={suggestions}
          onSelect={insertAutocompleteEmoji}
          selectedIndex={autocompleteIndex}
        />

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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onSelect={handleSelect}
          placeholder={`Message #${channelId ? 'channel' : ''}`}
          className="flex-1 bg-transparent text-discord-text placeholder-discord-lighter py-[11px] px-1 resize-none max-h-[200px] outline-none text-base leading-[1.375rem]"
          rows={1}
          disabled={sending}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
          }}
        />

        {/* Emoji picker button */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker(v => !v)}
            className="p-3 text-discord-channels-default hover:text-discord-text transition-colors shrink-0"
            title="Emoji"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-12 right-0 z-50">
              <EmojiPicker onSelect={(native) => {
                insertEmoji({ native });
                setShowEmojiPicker(false);
              }} />
            </div>
          )}
        </div>

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
