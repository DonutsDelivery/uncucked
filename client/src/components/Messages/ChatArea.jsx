import { useState } from 'react';
import { useGuild } from '../../context/GuildContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMessages } from '../../hooks/useMessages.js';
import MessageList from './MessageList.jsx';
import MessageInput from '../Input/MessageInput.jsx';
import AgeVerificationModal from '../Auth/AgeVerificationModal.jsx';
import NsfwGate from './NsfwGate.jsx';

export default function ChatArea() {
  const { selectedGuild, selectedChannel } = useGuild();
  const { user } = useAuth();
  const { messages, loading, hasMore, loadMore } = useMessages(selectedChannel?.id);
  const [nsfwBlocked, setNsfwBlocked] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);

  if (!selectedGuild) {
    return (
      <div className="flex-1 bg-discord-medium flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Discord Relay</h2>
          <p className="text-discord-lightest">Select a server from the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  if (!selectedChannel) {
    return (
      <div className="flex-1 bg-discord-medium flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-2">No channel selected</h2>
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
    <div className="flex-1 bg-discord-medium flex flex-col min-w-0">
      <ChannelHeader channel={selectedChannel} />

      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />

      <MessageInput channelId={selectedChannel.id} />
    </div>
  );
}

function ChannelHeader({ channel }) {
  return (
    <div className="h-12 px-4 flex items-center shadow-md border-b border-discord-darker/50 shrink-0">
      <span className="text-discord-lighter mr-2">#</span>
      <span className="font-semibold text-white">{channel.name}</span>
      {channel.topic && (
        <>
          <div className="w-px h-6 bg-discord-lighter/20 mx-3" />
          <span className="text-sm text-discord-lightest truncate">{channel.topic}</span>
        </>
      )}
    </div>
  );
}
