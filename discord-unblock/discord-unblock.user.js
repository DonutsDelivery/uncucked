// ==UserScript==
// @name         Discord Content Unblocker
// @namespace    https://github.com/discord-unblock
// @version      1.0.0
// @description  Removes Discord's sensitive content filter and NSFW age gates
// @match        https://discord.com/*
// @match        https://*.discord.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const LOG_PREFIX = '[Discord Unblocker]';
  const log = (...args) => console.log(LOG_PREFIX, ...args);

  log('Initializing...');

  // ─── Helpers ───────────────────────────────────────────────────────

  const EXPLICIT_FLAG = 16; // IS_EXPLICIT attachment flag

  function stripExplicitFlags(attachments) {
    if (!Array.isArray(attachments)) return false;
    let modified = false;
    for (const att of attachments) {
      if (att && typeof att.flags === 'number' && (att.flags & EXPLICIT_FLAG)) {
        att.flags &= ~EXPLICIT_FLAG;
        modified = true;
      }
    }
    return modified;
  }

  function patchMessage(msg) {
    if (!msg || typeof msg !== 'object') return false;
    return stripExplicitFlags(msg.attachments);
  }

  function patchMessages(data) {
    let modified = false;
    if (Array.isArray(data)) {
      // Standard message list: [{...}, {...}]
      for (const msg of data) {
        if (patchMessage(msg)) modified = true;
      }
    } else if (data && Array.isArray(data.messages)) {
      // Search results: { messages: [[msg, ...], [msg, ...]] }
      for (const group of data.messages) {
        if (Array.isArray(group)) {
          for (const msg of group) {
            if (patchMessage(msg)) modified = true;
          }
        }
      }
    }
    return modified;
  }

  // ─── Layer 1: Fetch Intercept ─────────────────────────────────────

  const originalFetch = window.fetch;
  const MESSAGE_URL_RE = /\/api\/v\d+\/channels\/\d+\/messages/;
  const SEARCH_URL_RE = /\/api\/v\d+\/(channels|guilds)\/\d+\/messages\/search/;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

    if (!url || (!MESSAGE_URL_RE.test(url) && !SEARCH_URL_RE.test(url))) {
      return response;
    }

    try {
      const clone = response.clone();
      const json = await clone.json();
      const modified = patchMessages(json);
      if (modified) {
        log('Patched fetch response:', url);
        return new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    } catch {
      // Not JSON or parse error — return original
    }

    return response;
  };

  log('Fetch intercept installed');

  // ─── Layer 2: WebSocket Intercept ─────────────────────────────────

  const OriginalWebSocket = window.WebSocket;

  function patchWSData(data) {
    if (typeof data !== 'string') return null;
    try {
      const payload = JSON.parse(data);
      if (payload.op !== 0 || !payload.d) return null;

      let modified = false;

      if (payload.t === 'MESSAGE_CREATE' || payload.t === 'MESSAGE_UPDATE') {
        modified = patchMessage(payload.d);
      } else if (payload.t === 'READY' || payload.t === 'READY_SUPPLEMENTAL') {
        if (payload.d?.user) {
          payload.d.user.nsfw_allowed = true;
          modified = true;
        }
      }

      if (modified) {
        log('Patched WebSocket event:', payload.t);
        return JSON.stringify(payload);
      }
    } catch {
      // Not JSON — ignore
    }
    return null;
  }

  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);

    // Intercept addEventListener('message', ...) — our listener fires first
    // and modifies event.data in place for subsequent listeners
    ws.addEventListener('message', function (event) {
      const patched = patchWSData(event.data);
      if (patched !== null) {
        Object.defineProperty(event, 'data', {
          value: patched,
          writable: false,
          configurable: true,
        });
      }
    });

    // Also trap onmessage setter to wrap the handler
    let _onmessage = null;
    Object.defineProperty(ws, 'onmessage', {
      get() { return _onmessage; },
      set(handler) {
        _onmessage = handler;
        // The addEventListener above already patches event.data before
        // onmessage fires, so no extra wrapping needed here.
      },
      configurable: true,
    });

    return ws;
  };

  // Preserve prototype chain and static properties
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  Object.defineProperty(window.WebSocket, 'name', { value: 'WebSocket' });
  for (const prop of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
    window.WebSocket[prop] = OriginalWebSocket[prop];
  }

  log('WebSocket intercept installed');

  // ─── Layer 3: Webpack User Patching ───────────────────────────────

  function patchWebpackUser() {
    let attempts = 0;
    const MAX_ATTEMPTS = 30;

    const interval = setInterval(() => {
      attempts++;

      if (typeof webpackChunkdiscord_app === 'undefined') {
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
          log('Webpack chunk not found after', MAX_ATTEMPTS, 'attempts');
        }
        return;
      }

      try {
        let moduleCache;
        webpackChunkdiscord_app.push([
          [Symbol()],
          {},
          (r) => { moduleCache = r.c; },
        ]);

        if (!moduleCache) {
          if (attempts >= MAX_ATTEMPTS) clearInterval(interval);
          return;
        }

        // Find a store with getCurrentUser() and patch the user object
        for (const id in moduleCache) {
          const mod = moduleCache[id]?.exports;
          if (!mod) continue;

          const store = mod.default || mod.Z || mod;
          if (typeof store?.getCurrentUser !== 'function') continue;

          try {
            const user = store.getCurrentUser();
            if (!user || !user.username) continue;

            user.nsfwAllowed = true;
            user.ageVerificationStatus = 3;

            log('Patched user:', user.username,
              '- nsfwAllowed:', user.nsfwAllowed,
              'ageVerification:', user.ageVerificationStatus);
            clearInterval(interval);
            return;
          } catch {
            // Module threw — skip
          }
        }

        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
          log('Could not find user store after', MAX_ATTEMPTS, 'attempts');
        }
      } catch (e) {
        log('Webpack patch error:', e.message);
        if (attempts >= MAX_ATTEMPTS) clearInterval(interval);
      }
    }, 500);
  }

  // Start webpack patching once DOM is interactive
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchWebpackUser);
  } else {
    patchWebpackUser();
  }

  // ─── Layer 4: DOM Fallback ────────────────────────────────────────

  // Class prefixes to strip from various elements
  const SPOILER_STRIP = ['opaque_', 'hidden_', 'constrainedObscureContent_'];
  const IMAGE_STRIP = ['obscured_', 'hiddenExplicit_', 'hiddenMosaicItem_'];

  function stripClasses(el, prefixes) {
    let stripped = false;
    for (const cls of [...el.classList]) {
      if (prefixes.some(p => cls.startsWith(p))) {
        el.classList.remove(cls);
        stripped = true;
      }
    }
    return stripped;
  }

  function sweepDOM(root) {
    if (!root) return;

    // 1. Hide explicit content warning overlays
    root.querySelectorAll('[class*="explicitContentWarning"], [class*="obscureWarning"]').forEach(el => {
      if (el.style.display !== 'none') {
        el.style.display = 'none';
        log('Hid content warning overlay');
      }
    });

    // 2. Strip spoiler/blur classes from spoiler containers
    root.querySelectorAll('[class*="spoilerContent"]').forEach(el => {
      if (stripClasses(el, SPOILER_STRIP)) {
        log('Revealed spoiler container');
      }
    });

    // 3. Strip obscured/hidden classes from image wrappers
    root.querySelectorAll('[class*="obscured_"], [class*="hiddenExplicit_"], [class*="hiddenMosaicItem_"]').forEach(el => {
      if (stripClasses(el, IMAGE_STRIP)) {
        log('Revealed image wrapper');
      }
    });

    // 4. Auto-click NSFW gate "Continue" buttons
    root.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim();
      if (text === 'Continue' || text === 'I understand') {
        const gate = btn.closest('[class*="channelNotice"], [class*="nsfwGate"], [class*="ageGate"], [class*="ageConfirmation"]');
        if (gate) {
          log('Auto-clicking NSFW gate button:', text);
          setTimeout(() => btn.click(), 100);
        }
      }
    });
  }

  function patchDOM() {
    // Watch for new nodes AND attribute changes (Discord often adds elements
    // first, then applies blocking classes in a separate React render cycle)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) sweepDOM(node);
          }
        } else if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          const el = mutation.target;
          const cls = el.className;
          if (typeof cls !== 'string') continue;
          if (cls.includes('explicitContentWarning') || cls.includes('obscureWarning')) {
            el.style.display = 'none';
          }
          if (cls.includes('spoilerContent')) {
            stripClasses(el, SPOILER_STRIP);
          }
          if (cls.includes('obscured_') || cls.includes('hiddenExplicit_') || cls.includes('hiddenMosaicItem_')) {
            stripClasses(el, IMAGE_STRIP);
          }
        }
      }
    });

    // Initial sweep
    sweepDOM(document.body || document.documentElement);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    // Periodic fallback sweep — catches anything the observer missed
    // (e.g. virtual-scrolled messages entering viewport)
    setInterval(() => sweepDOM(document.body), 2000);

    log('DOM observer installed');
  }

  // Start DOM patching when body is available
  if (document.body) {
    patchDOM();
  } else {
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        bodyObserver.disconnect();
        patchDOM();
      }
    });
    bodyObserver.observe(document.documentElement, { childList: true });
  }

  log('All layers initialized');
})();
