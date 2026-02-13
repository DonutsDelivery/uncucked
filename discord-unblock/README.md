# Discord Content Unblocker

Removes Discord's sensitive content filter and NSFW channel age gates. Works in the browser (userscript/extension) and desktop app (Vencord plugin).

## Option A: Vencord / Vesktop plugin (desktop app)

Works with [Vesktop](https://github.com/Vencord/Vesktop) (Linux/Mac) or any Discord client with [Vencord](https://vencord.dev/) installed.

1. Clone Vencord and install dependencies:
   ```bash
   git clone https://github.com/Vendicated/Vencord.git
   cd Vencord && npm i -g pnpm && pnpm install
   ```
2. Copy the plugin:
   ```bash
   cp -r /path/to/this-repo/discord-unblock/vencord-plugin src/userplugins/nsfwUnblocker
   ```
3. Build and point Vesktop to it:
   ```bash
   pnpm build
   ```
4. In Vesktop: **Settings → Vesktop → Developer Options → Vencord Location → Change** → select the `dist` folder
5. Restart Vesktop, then enable **NSFWUnblocker** in Settings → Plugins

## Option B: Browser Extension

No extra setup — install and it just works.

**[Install from Chrome Web Store](#)** (Chrome, Brave, Edge)

Or load manually:
1. Download/clone this repo
2. Go to `chrome://extensions` and enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `discord-unblock/extension/` folder
4. Open Discord — done

## Option C: Userscript

### Prerequisites

Install a userscript manager:

- **Chrome/Brave/Edge:** [Tampermonkey](https://www.tampermonkey.net/)
- **Firefox:** [Violentmonkey](https://violentmonkey.github.io/)

> **Note:** Greasemonkey is **not supported** — GM4 runs scripts in an isolated content script scope, so the XHR/WebSocket patches can't reach Discord's code. Use Tampermonkey or Violentmonkey instead.

### Install

Click the link below — your userscript manager will detect it and prompt you to install:

**[Install discord-unblock.user.js](https://raw.githubusercontent.com/DonutsDelivery/uncucked/main/discord-unblock/discord-unblock.user.js)**

Or manually:
1. Open your userscript manager dashboard
2. Create a new script
3. Paste the contents of `discord-unblock.user.js`
4. Save

### Chromium browsers (Chrome, Brave, Edge)

Tampermonkey requires extra permissions to inject userscripts:

1. Go to `chrome://extensions`
2. Toggle **Developer mode** on (top right corner)
3. Find Tampermonkey → click **Details** → scroll down → enable **Allow User Scripts**
4. Hard refresh Discord (`Ctrl+Shift+R`)

> Firefox with Violentmonkey does **not** require any of this.

## What it does

- **Removes explicit content flags** from image/video attachments so they render normally
- **Bypasses NSFW channel age gates** by patching the user's verification status
- **Auto-clicks "Continue" gates** on NSFW channels
- **Hides sensitive content overlays** in DMs and channels

## How it works

The script runs at `document-start` (before Discord's JS loads) and operates in four layers:

1. **XHR intercept** — Hijacks Discord's XMLHttpRequests for message endpoints, replaces them with clean fetches (no `X-Super-Properties` header) to bypass server-side 403s, and strips the `IS_EXPLICIT` flag (bit 16) from attachment metadata
2. **WebSocket intercept** — Patches real-time gateway events (`MESSAGE_CREATE`, `MESSAGE_UPDATE`) to strip the same flag from live messages
3. **Webpack user patch** — Reaches into Discord's internal module cache to set `nsfwAllowed = true` and `ageVerificationStatus = 3` on the current user object
4. **DOM fallback** — MutationObserver that hides any explicit content warning overlays and auto-clicks NSFW gate buttons

## Troubleshooting

Open browser DevTools console and look for `[Discord Unblocker]` log messages to see which layers activated.

If images still appear blocked after install, try a hard refresh (Ctrl+Shift+R) to ensure the script loads before Discord's bundle.

## License

MIT
