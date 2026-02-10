import { useSearchParams } from 'react-router-dom';

const errors = {
  no_code: 'Authorization was cancelled.',
  token_failed: 'Failed to authenticate with Discord.',
  user_fetch_failed: 'Failed to fetch user info.',
  unknown: 'An unknown error occurred.',
};

export default function LoginPage() {
  const [params] = useSearchParams();
  const error = params.get('error');

  return (
    <div className="h-screen flex items-center justify-center bg-discord-darker">
      <div className="bg-discord-dark rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Discord Relay</h1>
          <p className="text-discord-lightest text-sm">
            Access Discord servers without age verification.
            <br />
            Sign in with your Discord account to continue.
          </p>
        </div>

        {error && (
          <div className="bg-discord-red/10 border border-discord-red/20 rounded-md p-3 mb-6">
            <p className="text-discord-red text-sm">{errors[error] || errors.unknown}</p>
          </div>
        )}

        <a
          href="/api/auth/discord"
          className="flex items-center justify-center gap-3 w-full bg-discord-blurple hover:bg-discord-blurple/80 text-white font-medium py-3 px-4 rounded-md transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
          </svg>
          Sign in with Discord
        </a>

        <p className="text-discord-lighter text-xs text-center mt-6">
          By signing in, you confirm that you are at least 18 years old.
        </p>
      </div>
    </div>
  );
}
