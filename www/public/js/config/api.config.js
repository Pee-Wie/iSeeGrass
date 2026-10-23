/**
 * www/public/js/config/api.config.js
 *
 * Central API configuration. Every module that calls the backend
 * imports BASE_URL from here — change it once, it applies everywhere.
 *
 * Dev  : http://localhost/iSeeGrass          (XAMPP/LAMPP with project in htdocs)
 * Dev  : http://localhost:8000               (PHP built-in server from project root)
 * Prod : https://yourdomain.com              (update before release)
 *
 * Capacitor Android uses capacitor://localhost as origin; the PHP server
 * must be reachable from the device/emulator (usually the machine's LAN IP).
 */

const IS_CAPACITOR = window.location.protocol === 'capacitor:';

// Detect whether we're running on the live InfinityFree deployment.
// On the server, the frontend and backend share the same origin, so there
// is no cross-origin call and we can use a root-relative path.
// Locally (localhost / 127.0.0.1), PHP is on XAMPP Apache, so we point
// cross-origin at Apache even when the static frontend is on port 3000.
const IS_LOCAL = window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';

export const BASE_URL = IS_CAPACITOR
  ? 'http://10.0.2.2/iSeeGrass'       // Android emulator → host machine localhost
  : IS_LOCAL
    ? 'http://localhost/iSeeGrass'     // Dev web → XAMPP Apache
    : window.location.origin;          // Production: same origin, no CORS needed

/**
 * Build a full API path.
 * Usage:  apiUrl('/auth/login')  →  '/core/api/auth/login.php'  (or absolute on Android)
 *
 * @param  {string} path   e.g. '/auth/login', '/users', '/identify'
 * @returns {string}
 */
export function apiUrl(path) {
  // Normalise: strip leading slash
  const clean = path.replace(/^\/+/, '');

  // Split path from query string so .php lands on the file name, not after '?'
  const qIdx = clean.indexOf('?');
  const filePart  = qIdx === -1 ? clean : clean.slice(0, qIdx);
  const queryPart = qIdx === -1 ? ''    : clean.slice(qIdx);   // includes '?'

  return `${BASE_URL}/core/api/${filePart}.php${queryPart}`;
}
