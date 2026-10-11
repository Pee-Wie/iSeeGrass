/**
 * www/public/js/api/identify.api.js — Species Identification API
 *
 * Sends an image file to POST /api/identify and returns the full CREYNet
 * response normalised to our internal shape:
 *   {
 *     identification_id: number | null,   // null for guests
 *     model_type:        string,          // active engine track key
 *     top_result:        string,          // species_name from verdict
 *     top_confidence:    number,          // percent 0–100
 *     scores: [
 *       { label: string, confidence: number }
 *     ]
 *   }
 *
 * Engine track resolution:
 *   - If the caller passes an explicit modelType, use it (admin override).
 *   - Otherwise fetch GET /api/settings/engine fresh on every call so that
 *     any change the admin makes in the Reports → Model Engine tab is picked
 *     up immediately by the next identification — no page refresh required.
 *   - If the settings API is unreachable, fall back to 'improved_original'.
 */

import { get, put, del, upload } from './client.js';
import { getEngineTrack } from './settings.api.js';

/**
 * @typedef {'original'|'improved_original'|'6_species_proto'} ModelType
 */

/**
 * Resolve the engine track to use for a single identification call.
 * Always fetches fresh from the server unless an explicit override is given.
 *
 * @param {ModelType|null|undefined} explicit
 * @returns {Promise<string>}
 */
async function resolveTrack(explicit) {
  if (explicit != null) return explicit;

  try {
    const data = await getEngineTrack();
    return data.engine_track ?? 'improved_original';
  } catch {
    return 'improved_original';
  }
}

/**
 * Submit a File for CNN species identification.
 * The engine track is fetched live from admin system settings on every call,
 * so changes made in the admin panel take effect without a page refresh.
 *
 * @param  {File}            imageFile   The image to identify (JPEG / PNG / WebP, max 5 MB)
 * @param  {string|null}     [title]     Optional title for this identification run (max 120 chars).
 * @param  {ModelType|null}  [modelType] Explicit track override (admin use only).
 *                                       Omit to use the admin-configured setting.
 * @param  {boolean}         [guest]     Pass true from the guest Aid page to prevent the run
 *                                       being saved under a lingering logged-in session.
 * @returns {Promise<{identification_id:number|null, model_type:string, top_result:string, top_confidence:number, scores:Array}>}
 */
export async function identifyImage(imageFile, title, modelType, guest = false) {
  const track = await resolveTrack(modelType ?? null);

  const form = new FormData();
  form.append('image', imageFile);
  form.append('model_type', track);
  form.append('image_filename', imageFile.name);   // explicit filename field
  form.append('image_title', title ?? '');
  if (guest) form.append('guest', '1');            // tells PHP to skip auth entirely
  return upload('/identify', form);
}

/**
 * Fetch identification history for the current admin user.
 *
 * @param {{ limit?: number, offset?: number }} [params]
 * @returns {Promise<{ records: Array, total: number }>}
 */
export async function listIdentificationHistory(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit  != null) qs.set('limit',  String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return get(`/identifications/history${query}`);
}

/**
 * Rename an identification run's title.
 * @param {number} id
 * @param {string|null} title
 */
export async function updateIdentificationTitle(id, title) {
  return put('/identifications/update-title', { id, title });
}

/**
 * Hard-delete an identification run from the database.
 * @param {number} id
 */
export async function deleteIdentification(id) {
  return del(`/identifications/delete?id=${id}`);
}

/**
 * Fetch identification history for the current regular user (non-admin).
 *
 * @param {{limit?: number, offset?: number}} [params]
 * @returns {Promise<{ records: Array, total: number }>}
 */
export function listUserIdentificationHistory(params = {}) {
  const qs = new URLSearchParams();
  if (params.limit  != null) qs.set('limit',  String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return get(`/identifications/user-history${query}`);
}

/**
 * Rename an identification run's title (regular user).
 * @param {number} id
 * @param {string|null} title
 */
export async function updateUserIdentificationTitle(id, title) {
  return put('/identifications/user-update-title', { id, title });
}

/**
 * Hard-delete an identification run from the database (regular user).
 * @param {number} id
 */
export async function deleteUserIdentification(id) {
  return del(`/identifications/user-delete?id=${id}`);
}
