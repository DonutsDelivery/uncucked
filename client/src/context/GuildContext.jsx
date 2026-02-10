import { createContext, useContext, useState, useEffect } from 'react';

const GuildContext = createContext(null);

export function GuildProvider({ children }) {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);

  useEffect(() => {
    fetchGuilds();
  }, []);

  useEffect(() => {
    if (selectedGuild) {
      fetchChannels(selectedGuild.id);
    } else {
      setChannels([]);
      setSelectedChannel(null);
    }
  }, [selectedGuild]);

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
