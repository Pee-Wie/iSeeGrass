/**
 * www/public/js/api/auth.api.js
 *
 * Auth-specific API calls.
 * Thin wrappers around client.js — no UI logic here.
 *
 * Usage:
 *   import { login, logout, me, register } from '../api/auth.api.js';
 */

import { get, post } from './client.js';

/**
 * Authenticate a user.
 * @param  {string} username
 * @param  {string} password
 * @returns {Promise<object>}  Resolved with the user object on success.
 */
export function login(username, password) {
  return post('/auth/login', { username, password });
}

/**
 * End the current session.
 * @returns {Promise<object>}  Resolved with { message: '...' }
 */
export function logout() {
  return post('/auth/logout', {});
}

/**
 * Fetch the currently authenticated user from the session cookie.
 * Useful for restoring auth state on page load.
 * @returns {Promise<object>}  User object, or throws on 401 (triggers redirect).
 */
export function me() {
  return get('/auth/me');
}

/**
 * Register a new user account.
 * @param  {object} data  { username, email, password, first_name, last_name,
 *                          position, middle_name?, institution?, phone?, bio? }
 * @returns {Promise<object>}  The newly created user object.
 */
export function register(data) {
  return post('/auth/register', data);
}
