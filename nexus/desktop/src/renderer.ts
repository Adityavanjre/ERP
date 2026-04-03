import { BrowserWindow, session } from 'electron';

export function configureRenderer(mainWindow: BrowserWindow, allowedOrigins: string[]) {
  const trustedOrigins = Array.from(
    new Set([
      ...allowedOrigins,
      'https://klypso.in',
      'http://127.0.0.1:*',
      'http://localhost:*',
    ]),
  );

  const trustedOriginsList = trustedOrigins.join(' ');

  // MASQUERADE-001: Cloud Gateway Impersonation
  // Since the desktop app runs on 127.0.0.1 (not allowed by production CORS),
  // we intercept every request to the backend and pretend it's coming from klypso.in.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const { url, requestHeaders } = details;
    if (url.includes('onrender.com') || url.includes('klypso.in')) {
      requestHeaders['Origin'] = 'https://klypso.in';
      requestHeaders['Referer'] = 'https://klypso.in/portal/';
    }
    callback({ requestHeaders });
  });

  // COOKIE-002: Security Relaxation for Local Runtime
  // Production cookies are 'Secure', which Chromium blocks on http://127.0.0.1.
  // We strip the 'Secure' and 'SameSite' flags so the local app can store the session.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // MASQUERADE-002: CORS Nuke
    // We force the browser to accept all requests from klypso.in by injecting 
    // these permissive headers into every response.
    if (details.url.includes('klypso.in') || details.url.includes('onrender.com')) {
      responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS, PUT, DELETE'];
      responseHeaders['Access-Control-Allow-Headers'] = ['Content-Type, Authorization, X-Requested-With, X-CSRF-Token'];
      responseHeaders['Access-Control-Allow-Credentials'] = ['true'];
    }

    // Add CSP
    responseHeaders['Content-Security-Policy'] = [
      `default-src 'self' ${trustedOriginsList}; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${trustedOriginsList}; style-src 'self' 'unsafe-inline' ${trustedOriginsList}; img-src 'self' data: blob: https: http://127.0.0.1:* http://localhost:*; connect-src 'self' ws: wss: http: https:; font-src 'self' data: ${trustedOriginsList};`,
    ];

    const setCookie = responseHeaders['Set-Cookie'] || responseHeaders['set-cookie'];
    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const normalizedCookies = cookies.map(cookie => 
        cookie
          .replace(/;?\s*Secure/gi, '')
          .replace(/;?\s*SameSite=[a-z]+/gi, '; SameSite=Lax')
          .replace(/;?\s*Domain=[^; ]+/gi, '')
          .replace(/;?\s*Partitioned/gi, '')
      );
      responseHeaders['Set-Cookie'] = normalizedCookies;
    }

    callback({ responseHeaders });
  });

  mainWindow.webContents.on('did-navigate', (_event, url) => {
    if (url.includes('/login') || url.includes('/register')) {
      injectOfflineBadge(mainWindow);
    }
    if (url.includes('/dashboard')) {
      injectSyncButton(mainWindow);
    }
  });

  mainWindow.webContents.on('dom-ready', () => {
    injectOfflineBadge(mainWindow);
  });
}

async function injectSyncButton(win: BrowserWindow) {
  await win.webContents.executeJavaScript(`
    (function() {
      if (document.getElementById('nexus-sync-btn')) return;
      const sidebar = document.querySelector('nav') || document.querySelector('aside') || document.body;
      const btn = document.createElement('button');
      // Restore User Identity from localStorage
      const storedUser = localStorage.getItem('k_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          btn.innerText = \`• \${user.name || user.email || 'AUTHENTICATED'}\`;
          btn.style.color = '#10b981'; // Success Green
        } catch (e) {
          btn.innerText = '• LOCAL ADMINISTRATOR';
        }
      } else {
        btn.innerText = '• LOCAL ADMINISTRATOR';
      }
      btn.id = 'nexus-sync-btn';
      btn.innerHTML = '&#x2195; Sync';
      btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:12px 20px;background:#4F46E5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      btn.onclick = async function() {
        btn.innerHTML = '&#x2195; Syncing...';
        btn.disabled = true;
        try {
          const result = await window.nexusDesktop.sync.execute();
          if (result.phase === 'complete') {
            btn.innerHTML = '&#x2713; Synced (' + result.pushedCount + '\u2191 ' + result.pulledCount + '\u2193)';
            setTimeout(() => { btn.innerHTML = '&#x2195; Sync'; btn.disabled = false; }, 3000);
          } else if (result.phase === 'error') {
            btn.innerHTML = '&#x2717; Error';
            setTimeout(() => { btn.innerHTML = '&#x2195; Sync'; btn.disabled = false; }, 3000);
          }
        } catch(e) {
          btn.innerHTML = '&#x2717; Error';
          setTimeout(() => { btn.innerHTML = '&#x2195; Sync'; btn.disabled = false; }, 3000);
        }
      };
      document.body.appendChild(btn);
    })();
  `);
}

async function injectOfflineBadge(win: BrowserWindow) {
  await win.webContents.executeJavaScript(`
    (function() {
      if (document.getElementById('nexus-offline-badge')) return;
      const badge = document.createElement('div');
      badge.id = 'nexus-offline-badge';
      badge.style.cssText = 'position:fixed;top:10px;right:10px;z-index:10000;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;display:none;';
      document.body.appendChild(badge);

      function updateBadge() {
        if (navigator.onLine) {
          badge.style.display = 'none';
        } else {
          badge.style.display = 'block';
          badge.style.background = '#FEE2E2';
          badge.style.color = '#991B1B';
          badge.textContent = 'Offline - Changes saved locally';
        }
      }
      window.addEventListener('online', updateBadge);
      window.addEventListener('offline', updateBadge);
      updateBadge();
    })();
  `);
}
