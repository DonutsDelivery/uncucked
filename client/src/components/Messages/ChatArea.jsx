import { useState, useRef, useCallback } from 'react';
import { useGuild } from '../../context/GuildContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMessages } from '../../hooks/useMessages.js';
import { useTypingIndicator } from '../../hooks/useTypingIndicator.js';
import MessageList from './MessageList.jsx';
import MessageInput from '../Input/MessageInput.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import AgeVerificationModal from '../Auth/AgeVerificationModal.jsx';
import NsfwGate from './NsfwGate.jsx';

export default function ChatArea() {
  const { selectedGuild, selectedChannel } = useGuild();
  const { user } = useAuth();
  const { messages, loading, hasMore, loadMore } = useMessages(selectedChannel?.id);
  const { typingUsers, emitTyping } = useTypingIndicator(selectedChannel?.id, user?.id);
  const [nsfwBlocked, setNsfwBlocked] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const dragCounter = useRef(0);
  const messageInputRef = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length && messageInputRef.current) {
      messageInputRef.current.addFiles(droppedFiles);
    }
  }, []);

  const handleReply = useCallback((message) => {
    setReplyTo(message);
  }, []);

  if (!selectedGuild) {
    return (
      <div className="flex-1 bg-discord-medium flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-discord-white mb-2">Welcome to Discord Relay</h2>
          <p className="text-discord-lightest">Select a server from the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  if (!selectedChannel) {
    return (
      <div className="flex-1 bg-discord-medium flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-discord-white mb-2">No channel selected</h2>
          <p className="text-discord-lightest">Pick a channel from the list to start chatting.</p>
        </div>
      </div>
    );
  }

  // NSFW gate
  if (selectedChannel.nsfw && !user?.ageVerified) {
    return (
      <div className="flex-1 bg-discord-medium flex flex-col">
        <ChannelHeader channel={selectedChannel} />
        <NsfwGate onVerify={() => setShowAgeModal(true)} />
        {showAgeModal && (
          <AgeVerificationModal
            onClose={() => setShowAgeModal(false)}
            onVerified={() => setShowAgeModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="flex-1 bg-discord-medium flex flex-col min-w-0 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ChannelHeader channel={selectedChannel} />

      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onReply={handleReply}
      />

      <TypingIndicator typingUsers={typingUsers} />

      <MessageInput
        ref={messageInputRef}
        channelId={selectedChannel.id}
        onTyping={emitTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />

      {isDragging && (
        <div className="absolute inset-0 bg-discord-blurple/20 border-2 border-dashed border-discord-blurple rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-discord-blurple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-semibold text-discord-white">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelHeader({ channel }) {
  return (
    <div className="h-12 px-4 flex items-center border-b border-discord-separator shrink-0 bg-discord-medium">
      <span className="text-discord-channels-default mr-1.5 text-xl leading-none">#</span>
      <span className="font-semibold text-discord-white text-base">{channel.name}</span>
      {channel.topic && (
        <>
          <div className="w-px h-6 bg-discord-lighter/30 mx-3" />
          <span className="text-sm text-discord-muted truncate">{channel.topic}</span>
        </>
      )}
    </div>
  );
}
