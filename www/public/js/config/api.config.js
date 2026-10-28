/**
 * www/public/js/config/api.config.js
 *
 * Central API configuration. Every module that calls the backend
 * imports BASE_URL from here — change it once, it applies everywhere.
 *
 * All builds (browser and Capacitor Android) point to the Railway backend.
 */

export const BASE_URL = 'https://iseegrass-res.up.railway.app';

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
