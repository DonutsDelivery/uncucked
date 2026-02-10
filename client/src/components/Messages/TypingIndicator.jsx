export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers?.length) {
    // Reserve space to prevent layout shift
    return <div className="h-6 px-4 shrink-0" />;
  }

  let text;
  if (typingUsers.length === 1) {
    text = <><strong className="text-discord-white">{typingUsers[0].username}</strong> is typing</>;
  } else if (typingUsers.length === 2) {
    text = <><strong className="text-discord-white">{typingUsers[0].username}</strong> and <strong className="text-discord-white">{typingUsers[1].username}</strong> are typing</>;
  } else if (typingUsers.length === 3) {
    text = <><strong className="text-discord-white">{typingUsers[0].username}</strong>, <strong className="text-discord-white">{typingUsers[1].username}</strong>, and <strong className="text-discord-white">{typingUsers[2].username}</strong> are typing</>;
  } else {
    text = <>Several people are typing</>;
  }

  return (
    <div className="h-6 px-4 flex items-center gap-1.5 text-sm text-discord-muted shrink-0">
      <BouncingDots />
      <span>{text}...</span>
    </div>
  );
}

function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-[5px] h-[5px] bg-discord-white rounded-full"
          style={{
            animation: 'bounce-dot 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}
