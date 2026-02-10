import { createContext, useContext, useState, useEffect, useRef } from 'react';

const GuildContext = createContext(null);
const LAST_GUILD_KEY = 'discord-relay-last-guild';
const LAST_CHANNEL_KEY = 'discord-relay-last-channel';

export function GuildProvider({ children }) {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const restoredGuild = useRef(false);
  const pendingChannelId = useRef(null);

  useEffect(() => {
    fetchGuilds();
  }, []);

  // Restore last guild after guilds load
  useEffect(() => {
    if (restoredGuild.current || guilds.length === 0) return;
    restoredGuild.current = true;
    try {
      const savedGuildId = localStorage.getItem(LAST_GUILD_KEY);
      const savedChannelId = localStorage.getItem(LAST_CHANNEL_KEY);
      if (savedGuildId) {
        const guild = guilds.find(g => g.id === savedGuildId);
        if (guild) {
          pendingChannelId.current = savedChannelId;
          setSelectedGuild(guild);
        }
      }
    } catch {}
  }, [guilds]);

  useEffect(() => {
    if (selectedGuild) {
      fetchChannels(selectedGuild.id);
    } else {
      setChannels([]);
      setSelectedChannel(null);
    }
  }, [selectedGuild]);

  // Restore last channel after channels load
  useEffect(() => {
    if (!pendingChannelId.current || channels.length === 0) return;
    const channelId = pendingChannelId.current;
    pendingChannelId.current = null;
    for (const cat of channels) {
      const ch = cat.channels?.find(c => c.id === channelId);
      if (ch) { setSelectedChannel(ch); return; }
    }
  }, [channels]);

  // Persist selections (only after restore has been attempted)
  useEffect(() => {
    if (!restoredGuild.current) return;
    try {
      if (selectedGuild) localStorage.setItem(LAST_GUILD_KEY, selectedGuild.id);
      else localStorage.removeItem(LAST_GUILD_KEY);
    } catch {}
  }, [selectedGuild]);

  useEffect(() => {
    if (!restoredGuild.current) return;
    try {
      if (selectedChannel) localStorage.setItem(LAST_CHANNEL_KEY, selectedChannel.id);
      else localStorage.removeItem(LAST_CHANNEL_KEY);
    } catch {}
  }, [selectedChannel]);

  async function fetchGuilds() {
    try {
      const res = await fetch('/api/guilds', { credentials: 'include' });
      if (res.ok) setGuilds(await res.json());
    } catch (err) {
      console.error('Failed to fetch guilds:', err);
    } finally {
      setLoadingGuilds(false);
    }
  }

  async function fetchChannels(guildId) {
    setLoadingChannels(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' });
      if (res.ok) setChannels(await res.json());
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  }

  function selectGuild(guild) {
    setSelectedGuild(guild);
    setSelectedChannel(null);
  }

  return (
    <GuildContext.Provider value={{
      guilds, selectedGuild, selectGuild,
      channels, selectedChannel, setSelectedChannel,
      loadingGuilds, loadingChannels,
    }}>
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild() {
  const ctx = useContext(GuildContext);
  if (!ctx) throw new Error('useGuild must be used within GuildProvider');
  return ctx;
}
