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

  // ─── Layer 1: XHR Intercept ──────────────────────────────────────
  //
  // Discord uses XMLHttpRequest (not fetch) for API calls. The client
  // sends X-Super-Properties which encodes age verification state,
  // causing 403 on NSFW channel message endpoints. We hijack XHR.send()
  // for message URLs: instead of letting the original request go through,
  // we do a clean fetch() with just the Authorization header and inject
  // the result back into the XHR object before Discord processes it.

  const MESSAGE_URL_RE = /\/api\/v\d+\/channels\/\d+\/messages/;

  function getAuthToken() {
    try {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const token = iframe.contentWindow.localStorage.getItem('token');
      iframe.remove();
      return token ? token.replace(/"/g, '') : null;
    } catch {
      return null;
    }
  }

  const nativeXHROpen = XMLHttpRequest.prototype.open;
  const nativeXHRSend = XMLHttpRequest.prototype.send;
  const nativeXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url, async_, user, pass) {
    this._unblockerUrl = url;
    this._unblockerMethod = method;
    this._unblockerHeaders = {};
    return nativeXHROpen.call(this, method, url, async_, user, pass);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this._unblockerHeaders) this._unblockerHeaders[name] = value;
    return nativeXHRSetHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const url = this._unblockerUrl;
    const xhr = this;

    // For GET requests to message endpoints, hijack with clean fetch
    if (url && MESSAGE_URL_RE.test(url) && this._unblockerMethod === 'GET') {
      const token = this._unblockerHeaders['Authorization'] || getAuthToken();
      if (token) {
        log('Hijacking XHR for messages:', url);

        fetch(url, {
          method: 'GET',
          headers: { 'Authorization': token },
        })
          .then(async (resp) => {
            let text = await resp.text();

            // Also strip explicit flags from the response
            try {
              const json = JSON.parse(text);
              if (patchMessages(json)) {
                text = JSON.stringify(json);
                log('Stripped explicit flags from response');
              }
            } catch {}

            // Build response headers string
            const headerLines = [];
            resp.headers.forEach((v, k) => headerLines.push(k + ': ' + v));

            // Inject response into XHR
            Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
            Object.defineProperty(xhr, 'status', { value: resp.status, configurable: true });
            Object.defineProperty(xhr, 'statusText', { value: resp.statusText, configurable: true });
            Object.defineProperty(xhr, 'responseText', { value: text, configurable: true });
            Object.defineProperty(xhr, 'response', { value: text, configurable: true });
            Object.defineProperty(xhr, 'responseURL', { value: url, configurable: true });
            Object.defineProperty(xhr, 'getAllResponseHeaders', {
              value: () => headerLines.join('\r\n'),
              configurable: true,
            });
            Object.defineProperty(xhr, 'getResponseHeader', {
              value: (h) => resp.headers.get(h),
              configurable: true,
            });

            log('Injected clean response, status:', resp.status);

            // Fire XHR lifecycle events
            xhr.dispatchEvent(new Event('readystatechange'));
            xhr.dispatchEvent(new ProgressEvent('load'));
            xhr.dispatchEvent(new ProgressEvent('loadend'));
            if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
            if (typeof xhr.onload === 'function') xhr.onload();
          })
          .catch((e) => {
            log('Clean fetch failed, falling back to original XHR:', e);
            nativeXHRSend.call(xhr, body);
          });
        return; // Don't call original send
      }
    }

    return nativeXHRSend.call(this, body);
  };

  log('XHR intercept installed');

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
        // Get module cache — use the return-value trick from the push
        const moduleCache = webpackChunkdiscord_app.push([
          [Symbol()], {}, (r) => r.c,
        ]);
        webpackChunkdiscord_app.pop();

        if (!moduleCache || typeof moduleCache !== 'object') {
          if (attempts >= MAX_ATTEMPTS) clearInterval(interval);
          return;
        }

        // Find a store with getCurrentUser() — check prototype chain too
        for (const id in moduleCache) {
          try {
            const mod = moduleCache[id]?.exports;
            if (!mod) continue;

            const candidates = [];
            try { if (mod.default) candidates.push(mod.default); } catch {}
            try { if (mod.Z) candidates.push(mod.Z); } catch {}
            try { if (mod.ZP) candidates.push(mod.ZP); } catch {}
            candidates.push(mod);

            for (const prop of candidates) {
              if (!prop || typeof prop !== 'object') continue;
              const fn = prop.getCurrentUser || prop.__proto__?.getCurrentUser;
              if (typeof fn !== 'function') continue;

              const user = fn.call(prop);
              if (!user || !user.id) continue;

              user.nsfwAllowed = true;
              user.ageVerificationStatus = 3;

              log('Patched user:', user.username,
                '- nsfwAllowed:', user.nsfwAllowed,
                'ageVerification:', user.ageVerificationStatus);
              clearInterval(interval);
              return;
            }
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
