import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AgeVerificationModal({ onClose, onVerified }) {
  const { verifyAge } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    setLoading(true);
    const ok = await verifyAge();
    setLoading(false);
    if (ok) {
      onVerified?.();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-discord-dark rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-3">Age Verification Required</h2>
        <p className="text-discord-lightest text-sm mb-6">
          This channel contains age-restricted content. You must confirm that you are at least 18 years old to view it.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-discord-light hover:bg-discord-lighter text-white py-2 px-4 rounded-md transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex-1 bg-discord-blurple hover:bg-discord-blurple/80 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : "I'm 18 or older"}
          </button>
        </div>
      </div>
    </div>
  );
}
