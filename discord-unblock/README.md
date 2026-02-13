# Discord Content Unblocker

A userscript that removes Discord's client-side sensitive content filter and NSFW channel age gates.

## Prerequisites

Install a userscript manager for your browser:

- **Chrome/Edge:** [Tampermonkey](https://www.tampermonkey.net/)
- **Firefox:** [Violentmonkey](https://violentmonkey.github.io/) or [Greasemonkey](https://www.greasespot.net/)

## Install

Click the link below — your userscript manager will detect it and prompt you to install:

**[Install discord-unblock.user.js](https://raw.githubusercontent.com/DonutsDelivery/uncucked/main/discord-unblock/discord-unblock.user.js)**

Or manually:
1. Open your userscript manager dashboard
2. Create a new script
3. Paste the contents of `discord-unblock.user.js`
4. Save

## What it does

- **Removes explicit content flags** from image/video attachments so they render normally
- **Bypasses NSFW channel age gates** by patching the user's verification status
- **Auto-clicks "Continue" gates** on NSFW channels
- **Hides sensitive content overlays** in DMs and channels

## How it works

The script runs at `document-start` (before Discord's JS loads) and operates in four layers:

1. **Fetch intercept** — Patches API responses to strip the `IS_EXPLICIT` flag (bit 16) from attachment metadata
2. **WebSocket intercept** — Patches real-time gateway events (`MESSAGE_CREATE`, `MESSAGE_UPDATE`) to strip the same flag from live messages
3. **Webpack user patch** — Reaches into Discord's internal module cache to set `nsfwAllowed = true` and `ageVerificationStatus = 3` on the current user object
4. **DOM fallback** — MutationObserver that hides any explicit content warning overlays and auto-clicks NSFW gate buttons

## Troubleshooting

Open browser DevTools console and look for `[Discord Unblocker]` log messages to see which layers activated.

If images still appear blocked after install, try a hard refresh (Ctrl+Shift+R) to ensure the script loads before Discord's bundle.

## License

MIT
