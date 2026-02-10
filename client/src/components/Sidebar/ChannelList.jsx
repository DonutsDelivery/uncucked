import { useGuild } from '../../context/GuildContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ChannelList() {
  const { selectedGuild, channels, selectedChannel, setSelectedChannel, loadingChannels } = useGuild();
  const { user } = useAuth();

  if (!selectedGuild) {
    return (
      <div className="w-60 bg-discord-dark flex flex-col shrink-0">
        <div className="h-12 px-4 flex items-center shadow-md border-b border-discord-darker">
          <span className="font-semibold text-white">Discord Relay</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-discord-lighter text-sm text-center">
            Select a server to view channels
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-discord-dark flex flex-col shrink-0">
      {/* Guild header */}
      <div className="h-12 px-4 flex items-center shadow-md border-b border-discord-darker">
        <span className="font-semibold text-white truncate">{selectedGuild.name}</span>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {loadingChannels ? (
          <div className="text-discord-lighter text-sm p-2">Loading...</div>
        ) : (
          channels.map(category => (
            <div key={category.id || 'uncategorized'} className="mb-1">
              {category.name && (
                <div className="flex items-center px-1 py-1.5 text-xs font-semibold text-discord-lighter uppercase tracking-wide">
                  <svg className="w-3 h-3 mr-0.5" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M2 4.5L6 8.5L10 4.5H2Z" />
                  </svg>
                  <span className="truncate">{category.name}</span>
                </div>
              )}

              {category.channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-discord-light text-white'
                      : 'text-discord-lightest hover:bg-discord-light/30 hover:text-discord-text'
                  }`}
                >
                  <span className="text-discord-lighter shrink-0">#</span>
                  <span className="truncate">{channel.name}</span>
                  {channel.nsfw && (
                    <span className="ml-auto text-[10px] bg-discord-red/20 text-discord-red px-1 rounded shrink-0">
                      NSFW
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* User panel at bottom */}
      <div className="h-[52px] bg-discord-darker/50 px-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xs">
          {(user?.globalName || user?.username || '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">{user?.globalName || user?.username}</div>
          <div className="text-[11px] text-discord-lighter truncate">Online</div>
        </div>
      </div>
    </div>
  );
}
