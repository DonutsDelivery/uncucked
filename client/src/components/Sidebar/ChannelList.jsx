import { useState, useCallback } from 'react';
import { useGuild } from '../../context/GuildContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getThemes, getSavedTheme, applyTheme } from '../../utils/themes.js';

const COLLAPSED_KEY = 'discord-relay-collapsed';

function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {}; } catch { return {}; }
}

function saveCollapsed(state) {
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(state)); } catch {}
}

export default function ChannelList() {
  const { selectedGuild, channels, selectedChannel, setSelectedChannel, loadingChannels } = useGuild();
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(getSavedTheme);
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  function switchTheme(name) {
    applyTheme(name);
    setCurrentTheme(name);
  }

  const toggleCategory = useCallback((categoryId) => {
    setCollapsed(prev => {
      const next = { ...prev, [categoryId]: !prev[categoryId] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  if (!selectedGuild) {
    return (
      <div className="w-60 bg-discord-dark flex flex-col shrink-0 border-r border-discord-separator">
        <div className="h-12 px-4 flex items-center border-b border-discord-separator">
          <span className="font-semibold text-discord-white">Discord Relay</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-discord-lighter text-sm text-center">
            Select a server to view channels
          </p>
        </div>
        <UserPanel user={user} currentTheme={currentTheme} switchTheme={switchTheme} />
      </div>
    );
  }

  return (
    <div className="w-60 bg-discord-dark flex flex-col shrink-0 border-r border-discord-separator">
      {/* Guild header */}
      <div className="h-12 px-4 flex items-center border-b border-discord-separator">
        <span className="font-semibold text-discord-white truncate">{selectedGuild.name}</span>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {loadingChannels ? (
          <div className="text-discord-lighter text-sm p-2">Loading...</div>
        ) : (
          channels.map(category => {
            const catId = category.id || 'uncategorized';
            const isCollapsed = !!collapsed[catId];
            return (
              <div key={catId} className="mb-1">
                {category.name && (
                  <div
                    onClick={() => toggleCategory(catId)}
                    className="flex items-center px-0.5 pt-4 pb-1 text-xs font-semibold text-discord-channels-default uppercase tracking-[.02em] cursor-pointer hover:text-discord-lightest"
                  >
                    <svg className={`w-3 h-3 mr-0.5 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2 4.5L6 8.5L10 4.5H2Z" />
                    </svg>
                    <span className="truncate">{category.name}</span>
                  </div>
                )}

                {category.channels.map(channel => {
                  const isSelected = selectedChannel?.id === channel.id;
                  if (isCollapsed && !isSelected) return null;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full flex items-center gap-1.5 px-2 py-[6px] rounded text-[15px] leading-5 transition-colors ${
                        isSelected
                          ? 'bg-discord-light/60 text-discord-white'
                          : 'text-discord-channels-default hover:bg-discord-light/30 hover:text-discord-lightest'
                      }`}
                    >
                      <span className="text-discord-channels-default shrink-0 text-lg leading-5">#</span>
                      <span className="truncate">{channel.name}</span>
                      {channel.nsfw && (
                        <span className="ml-auto text-[10px] bg-discord-red/20 text-discord-red px-1 rounded shrink-0">
                          NSFW
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <UserPanel user={user} currentTheme={currentTheme} switchTheme={switchTheme} />
    </div>
  );
}

function UserPanel({ user, currentTheme, switchTheme }) {
  const themes = getThemes();

  return (
    <div className="bg-discord-darker/80 px-2 py-2 flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xs shrink-0">
        {(user?.globalName || user?.username || '?')[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-discord-white font-medium truncate leading-[18px]">{user?.globalName || user?.username}</div>
        <div className="text-[11px] text-discord-muted truncate leading-[13px]">Online</div>
      </div>
      <div className="flex gap-1 shrink-0">
        {Object.entries(themes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => switchTheme(key)}
            className={`w-5 h-5 rounded-full border-2 transition-colors ${
              currentTheme === key ? 'border-discord-blurple' : 'border-transparent hover:border-discord-lighter'
            }`}
            style={{ backgroundColor: theme.preview }}
            title={theme.label}
          />
        ))}
      </div>
    </div>
  );
}
