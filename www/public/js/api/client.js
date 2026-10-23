/**
 * www/public/js/api/client.js
 *
 * Generic fetch wrapper for all iSeeGrass API calls.
 *
 * Features:
 *   - Always sends `credentials: 'include'` so the HttpOnly session cookie travels
 *   - Always sets `Content-Type: application/json` for POST/PUT bodies
 *   - Parses the JSON response and returns the `data` field on success
 *   - On 401, redirects to the login page automatically
 *   - On any other non-ok response, throws an Error with the server's message
 *
 * Usage:
 *   import { get, post, put, del } from '../api/client.js';
 *
 *   const user    = await get('/auth/me');
 *   const session = await post('/auth/login', { username, password });
 */

import { apiUrl } from '../config/api.config.js';

// Relative path from any view back to the login page
// Views live at: www/views/{area}/page.html
// Login lives at: www/views/auth/login.html
const LOGIN_PATH = '/views/auth/login.html';

// ── Cross-tab session guard ───────────────────────────────────────────────────
// When a new login happens in any tab, every *other* tab receives this broadcast
// and is immediately logged out — no page refresh needed.
//
// Guard against self-eviction: the login page stamps a monotonic timestamp into
// localStorage just before it posts the broadcast AND before it navigates away.
// The newly-loaded page's listener ignores any broadcast whose `loginAt` value
// matches the stamp — those are messages from the login this tab itself just
// performed, not from a different tab.
(function initSessionBroadcastListener() {
  try {
    const ch = new BroadcastChannel('iseegrass_session');

    ch.addEventListener('message', async (event) => {
      if (event.data?.type !== 'session-started') return;

      // The login page writes 'isee_own_login_at' right before posting.
      // If the timestamp in the message matches ours, we fired this broadcast —
      // ignore it so we don't log ourselves out mid-navigation.
      const ownLoginAt = localStorage.getItem('isee_own_login_at');
      if (ownLoginAt && event.data.loginAt && String(event.data.loginAt) === ownLoginAt) {
        return;
      }

      // Silently invalidate the old server session (fire-and-forget)
      try {
        await fetch(apiUrl('/auth/logout'), {
          method      : 'POST',
          credentials : 'include',
          headers     : {
            'Content-Type'     : 'application/json',
            'X-Requested-With' : 'XMLHttpRequest',
          },
          body: JSON.stringify({}),
        });
      } catch (_) {
        // Network failure is fine — the server session will expire on its own
      }

      // Wipe local state and redirect this tab to login
      localStorage.removeItem('isee_user');
      localStorage.removeItem('isee_own_login_at');
      window.location.href = `${LOGIN_PATH}?reason=new_session`;
    });
  } catch (_) {
    // BroadcastChannel not supported — skip silently
  }
})();

/**
 * Core request function. Not exported — use the verb helpers below.
 *
 * @param  {string}  method      HTTP verb
 * @param  {string}  path        API path, e.g. '/auth/login'
 * @param  {object}  [body]      Request payload (JSON-serialised automatically)
 * @param  {object}  [opts]      Options
 * @param  {boolean} [opts.noRedirect]  When true, a 401 throws instead of redirecting.
 *                                      Use for non-critical background calls (navbar, stats).
 * @returns {Promise<any>}   Resolved with `data` field from the response
 */
async function request(method, path, body = null, opts = {}) {
  const url = apiUrl(path);

  const options = {
    method,
    credentials: 'include',       // send + receive the HttpOnly session cookie
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  };

  if (body !== null && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (networkErr) {
    throw new Error('Network error — check your connection and try again.');
  }

  // 401 → session expired or not logged in
  // Guards:
  //   1. noRedirect — caller handles it (e.g. navbar background load).
  //   2. !navigator.onLine — don't redirect when offline; cookie may be fine,
  //      server is just unreachable.
  if (response.status === 401) {
    if (opts.noRedirect || !navigator.onLine) {
      throw new Error('Offline — cannot verify session. Please reconnect.');
    }
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${LOGIN_PATH}?next=${returnTo}`;
    throw new Error('Session expired. Redirecting to login…');
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok || json.success === false) {
    const msg = json.error || json.message || `Request failed (HTTP ${response.status}).`;
    const err = new Error(msg);
    err.status = response.status;
    err.body   = json;
    throw err;
  }

  // Return the `data` payload, or the full object if there's no `data` key
  return json.data !== undefined ? json.data : json;
}

// ── Exported verb helpers ─────────────────────────────────────────────────────

/** GET  /api/{path}
 *  Pass opts.noRedirect = true for background/non-critical calls that should
 *  never trigger a login redirect on 401 (e.g. navbar avatar loader). */
export function get(path, opts = {}) {
  return request('GET', path, null, opts);
}

/** POST /api/{path}  with a JSON body */
export function post(path, body) {
  return request('POST', path, body);
}

/** PUT  /api/{path}  with a JSON body */
export function put(path, body) {
  return request('PUT', path, body);
}

/** DELETE /api/{path} */
export function del(path) {
  return request('DELETE', path);
}

/**
 * POST multipart/form-data (for file uploads — identify endpoint).
 * Does NOT set Content-Type so the browser sets the correct boundary.
 *
 * @param  {string}   path
 * @param  {FormData} formData
 */
export async function upload(path, formData) {
  const url = apiUrl(path);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: formData,
    });
  } catch (networkErr) {
    throw new Error('Network error — check your connection and try again.');
  }

  if (response.status === 401) {
    if (!navigator.onLine) {
      throw new Error('Offline — cannot verify session. Please reconnect.');
    }
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `${LOGIN_PATH}?next=${returnTo}`;
    throw new Error('Session expired. Redirecting to login…');
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok || json.success === false) {
    const msg = json.error || `Upload failed (HTTP ${response.status}).`;
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  return json.data !== undefined ? json.data : json;
}
