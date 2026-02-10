export default function NsfwGate({ onVerify }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">🔞</div>
        <h2 className="text-xl font-bold text-white mb-2">Age-Restricted Channel</h2>
        <p className="text-discord-lightest text-sm mb-6">
          This channel is marked as NSFW. You must verify your age before viewing its content.
        </p>
        <button
          onClick={onVerify}
          className="bg-discord-blurple hover:bg-discord-blurple/80 text-white font-medium py-2 px-6 rounded-md transition-colors"
        >
          Verify Age
        </button>
      </div>
    </div>
  );
}
