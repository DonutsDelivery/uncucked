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
      for (const msg of data) {
        if (patchMessage(msg)) modified = true;
      }
    } else if (data && Array.isArray(data.messages)) {
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

            try {
              const json = JSON.parse(text);
              if (patchMessages(json)) {
                text = JSON.stringify(json);
                log('Stripped explicit flags from response');
              }
            } catch {}

            const headerLines = [];
            resp.headers.forEach((v, k) => headerLines.push(k + ': ' + v));

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
        return;
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
          // Only bypass ID verification — preserve the regular "are you 18?" gate
          payload.d.user.age_verification_status = 3;
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

    // Patch incoming messages — addEventListener fires before onmessage,
    // so Discord's handler will see the modified event.data
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

    // Don't trap onmessage — let the browser dispatch normally
    return ws;
  };

  window.WebSocket.prototype = OriginalWebSocket.prototype;
  Object.defineProperty(window.WebSocket, 'name', { value: 'WebSocket' });
  for (const prop of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
    window.WebSocket[prop] = OriginalWebSocket[prop];
  }

  log('WebSocket intercept installed');

  // ─── Layer 3: Webpack User Patching ───────────────────────────────

  function patchWebpackUser() {
    let attempts = 0;
    const MAX_ATTEMPTS = 60;

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
        const moduleCache = webpackChunkdiscord_app.push([
          [Symbol()], {}, (r) => r.c,
        ]);
        webpackChunkdiscord_app.pop();

        if (!moduleCache || typeof moduleCache !== 'object') {
          if (attempts >= MAX_ATTEMPTS) clearInterval(interval);
          return;
        }

        for (const id in moduleCache) {
          try {
            const mod = moduleCache[id]?.exports;
            if (!mod) continue;

            // Check all possible export shapes
            const candidates = [];
            try { if (mod.default) candidates.push(mod.default); } catch {}
            try { if (mod.Z) candidates.push(mod.Z); } catch {}
            try { if (mod.ZP) candidates.push(mod.ZP); } catch {}
            try {
              for (const key of Object.keys(mod)) {
                if (mod[key] && typeof mod[key] === 'object') candidates.push(mod[key]);
              }
            } catch {}
            candidates.push(mod);

            for (const prop of candidates) {
              if (!prop || typeof prop !== 'object') continue;
              let fn;
              try { fn = prop.getCurrentUser; } catch { continue; }
              if (typeof fn !== 'function') {
                try { fn = prop.__proto__?.getCurrentUser; } catch { continue; }
                if (typeof fn !== 'function') continue;
              }

              let user;
              try { user = fn.call(prop); } catch { continue; }
              if (!user || !user.id) continue;

              // Only bypass ID verification — preserve the regular "are you 18?" gate
              user.ageVerificationStatus = 3;

              log('Patched user:', user.username,
                'ageVerification:', user.ageVerificationStatus);

              // Re-patch periodically in case Discord resets the user object
              clearInterval(interval);
              setInterval(() => {
                try {
                  const u = fn.call(prop);
                  if (u) u.ageVerificationStatus = 3;
                } catch {}
              }, 3000);
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
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchWebpackUser);
  } else {
    patchWebpackUser();
  }

  // ─── Layer 4: DOM Fallback ────────────────────────────────────────

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

    root.querySelectorAll('[class*="explicitContentWarning"], [class*="obscureWarning"]').forEach(el => {
      if (el.style.display !== 'none') {
        el.style.display = 'none';
        log('Hid content warning overlay');
      }
    });

    root.querySelectorAll('[class*="spoilerContent"]').forEach(el => {
      if (stripClasses(el, SPOILER_STRIP)) {
        log('Revealed spoiler container');
      }
    });

    root.querySelectorAll('[class*="obscured_"], [class*="hiddenExplicit_"], [class*="hiddenMosaicItem_"]').forEach(el => {
      if (stripClasses(el, IMAGE_STRIP)) {
        log('Revealed image wrapper');
      }
    });

    // Regular "are you 18?" gates are left intact — users confirm age themselves
  }

  function patchDOM() {
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

    sweepDOM(document.body || document.documentElement);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    setInterval(() => sweepDOM(document.body), 2000);

    log('DOM observer installed');
  }

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
