import { useGuild } from '../../context/GuildContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { guildIconUrl, userAvatarUrl } from '../../utils/cdn.js';

export default function GuildList() {
  const { guilds, selectedGuild, selectGuild, loadingGuilds } = useGuild();
  const { user, logout } = useAuth();

  return (
    <div className="w-[72px] bg-discord-darker flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0">
      {/* Home button */}
      <button
        onClick={() => selectGuild(null)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:rounded-xl ${
          !selectedGuild ? 'bg-discord-blurple rounded-xl' : 'bg-discord-dark hover:bg-discord-blurple'
        }`}
        title="Home"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
        </svg>
      </button>

      <div className="w-8 h-0.5 bg-discord-dark rounded-full" />

      {/* Guild icons */}
      {loadingGuilds ? (
        <div className="text-discord-lighter text-xs">...</div>
      ) : (
        guilds.map(guild => (
          <button
            key={guild.id}
            onClick={() => selectGuild(guild)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 hover:rounded-xl overflow-hidden ${
              selectedGuild?.id === guild.id ? 'rounded-xl ring-2 ring-white/20' : ''
            }`}
            title={guild.name}
          >
            {guild.icon ? (
              <img
                src={guildIconUrl(guild.id, guild.icon)}
                alt={guild.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-discord-dark hover:bg-discord-blurple flex items-center justify-center text-white text-sm font-medium transition-colors">
                {guild.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
              </div>
            )}
          </button>
        ))
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User avatar / logout */}
      <div className="relative group">
        <button
          className="w-12 h-12 rounded-full overflow-hidden"
          title={`${user?.username} - Click to logout`}
          onClick={logout}
        >
          <img
            src={userAvatarUrl(user?.id, user?.avatar)}
            alt={user?.username}
            className="w-full h-full object-cover"
          />
        </button>
        <div className="absolute left-14 bottom-0 bg-discord-darker text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
          {user?.globalName || user?.username} (click to logout)
        </div>
      </div>
    </div>
  );
}
