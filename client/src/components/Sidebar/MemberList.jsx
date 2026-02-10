import { useState, useEffect } from 'react';
import { useGuild } from '../../context/GuildContext.jsx';
import { userAvatarUrl, memberAvatarUrl } from '../../utils/cdn.js';

export default function MemberList() {
  const { selectedGuild } = useGuild();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedGuild) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/guilds/${selectedGuild.id}/members`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!cancelled && Array.isArray(data)) setMembers(data);
      })
      .catch(err => console.error('Failed to fetch members:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedGuild?.id]);

  if (!selectedGuild) return null;

  // Group members by their highest role — Map preserves insertion order from server
  const grouped = new Map();
  members.forEach(m => {
    const topRole = m.roles[0]?.name || 'Online';
    if (!grouped.has(topRole)) {
      grouped.set(topRole, { name: topRole, color: m.roles[0]?.color || null, members: [] });
    }
    grouped.get(topRole).members.push(m);
  });

  return (
    <div className="w-60 bg-discord-dark flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto pt-6 px-2">
        {loading ? (
          <div className="text-discord-muted text-sm px-2">Loading members...</div>
        ) : (
          [...grouped.values()].map(group => (
            <div key={group.name} className="mb-2">
              <div className="px-2 pt-4 pb-1 text-xs font-semibold text-discord-channels-default uppercase tracking-[.02em]">
                {group.name} — {group.members.length}
              </div>
              {group.members.map(member => (
                <MemberItem key={member.id} member={member} guildId={selectedGuild.id} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MemberItem({ member, guildId }) {
  const displayName = member.nickname || member.globalName || member.username;
  const nameColor = member.highestRoleColor || undefined;
  const avatarSrc = memberAvatarUrl(guildId, member.id, member.guildAvatar, 64)
    || userAvatarUrl(member.id, member.avatar, 64);

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-discord-light/30 cursor-pointer group">
      <div className="relative shrink-0">
        <img
          src={avatarSrc}
          alt={displayName}
          className="w-8 h-8 rounded-full"
        />
        {member.bot && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-discord-blurple text-white text-[8px] px-0.5 rounded font-bold leading-tight">
            BOT
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-medium truncate"
          style={{ color: nameColor }}
        >
          {displayName}
        </div>
      </div>
      {member.isOwner && (
        <svg className="w-4 h-4 text-yellow-400 shrink-0" viewBox="0 0 16 16" fill="currentColor" title="Server Owner">
          <path d="M13.6572 5.42868L13.8936 9.85604C13.9066 10.0986 13.7825 10.3268 13.5721 10.4486L8.28022 13.5752C8.10813 13.6733 7.8919 13.6733 7.71981 13.5752L2.42793 10.4486C2.21752 10.3268 2.09342 10.0986 2.10642 9.85604L2.34285 5.42868C2.35317 5.24282 2.46054 5.07554 2.62462 4.98349L7.71981 2.12478C7.8919 2.02675 8.10813 2.02675 8.28022 2.12478L13.3754 4.98349C13.5395 5.07554 13.6469 5.24282 13.6572 5.42868Z" />
        </svg>
      )}
    </div>
  );
}
