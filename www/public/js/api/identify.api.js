/**
 * www/public/js/api/identify.api.js — Species Identification API
 *
 * Sends an image file to POST /api/identify and returns the full CREYNet
 * response normalised to our internal shape:
 *   {
 *     identification_id: number | null,   // null for guests
 *     image_url:         string | null,   // stored source image URL for authenticated users
 *     latitude:          number | null,   // from uploaded image GPS EXIF, when present
 *     longitude:         number | null,
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
 *
 * Offline queueing:
 *   - When identifyImage() is called without network connectivity the image
 *     is stored in IndexedDB via identify-queue.js and an OfflineQueuedError
 *     is thrown so callers can show an appropriate "queued" status.
 *   - The caller is responsible for calling drain() when connectivity returns.
 *   - Guest calls (guest=true) are NOT queued — guests have no persistent
 *     session to associate the job with.
 */

import { get, put, del, upload } from './client.js';
import { getEngineTrack } from './settings.api.js';
import { enqueue, isOfflineError, OfflineQueuedError } from '../utils/identify-queue.js?v=5';
import { readImageExifCoordinates } from '../utils/image-location.js?v=1';

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

async function getImageOrDeviceCoordinates(imageFile) {
  const imageCoordinates = await readImageExifCoordinates(imageFile);
  if (imageCoordinates) return imageCoordinates;
  if (!window.Capacitor?.isNativePlatform?.() || !navigator.geolocation) {
    return null;
  }

  return new Promise(resolve => {
    try {
      navigator.geolocation.getCurrentPosition(
        position => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        () => resolve(null),
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 5_000 },
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Submit a File for CNN species identification.
 * The engine track is fetched live from admin system settings on every call,
 * so changes made in the admin panel take effect without a page refresh.
 *
 * When the device is offline and this is not a guest call, the job is stored
 * in IndexedDB and an OfflineQueuedError is thrown. The caller should catch
 * OfflineQueuedError and update the UI to show "queued" status.
 *
 * @param  {File}            imageFile   The image to identify (JPEG / PNG / WebP, max 5 MB)
 * @param  {string|null}     [title]     Optional title for this identification run (max 120 chars).
 * @param  {ModelType|null}  [modelType] Explicit track override (admin use only).
 *                                       Omit to use the admin-configured setting.
 * @param  {boolean}         [guest]     Pass true from the guest Aid page to prevent the run
 *                                       being saved under a lingering logged-in session.
 * @param  {string|null}     [histId]    The UI history UUID to attach to the queue entry.
 *                                       Required for offline queueing; ignored for guests.
 * @param  {{latitude:number, longitude:number}|null} [queuedCoordinates]
 *                                       Preserved fallback coordinates during offline sync.
 * @returns {Promise<{identification_id:number|null, latitude:number|null, longitude:number|null, model_type:string, top_result:string, top_confidence:number, scores:Array}>}
 * @throws  {OfflineQueuedError}  When offline (non-guest only) — job stored in IDB.
 */
export async function identifyImage(
  imageFile, title, modelType, guest = false, histId = null, queuedCoordinates,
) {
  const track = await resolveTrack(modelType ?? null);
  const coordinates = guest
    ? null
    : queuedCoordinates !== undefined
      ? queuedCoordinates
      : await getImageOrDeviceCoordinates(imageFile);

  const form = new FormData();
  form.append('image', imageFile);
  form.append('model_type', track);
  form.append('image_filename', imageFile.name);   // explicit filename field
  form.append('image_title', title ?? '');
  if (coordinates) {
    form.append('latitude', String(coordinates.latitude));
    form.append('longitude', String(coordinates.longitude));
  }
  if (guest) form.append('guest', '1');            // tells PHP to skip auth entirely

  try {
    return await upload('/identify', form);
  } catch (err) {
    // Queue offline jobs (authenticated users only — guests have no session to resume)
    if (!guest && isOfflineError(err)) {
      const resolvedHistId = histId ?? crypto.randomUUID();
      const queueId = await enqueue({
        imageBlob : new Blob([await imageFile.arrayBuffer()], { type: imageFile.type }),
        fileName  : imageFile.name,
        title     : title ?? null,
        modelType : track,
        histId    : resolvedHistId,
        latitude  : coordinates?.latitude ?? null,
        longitude : coordinates?.longitude ?? null,
      });
      throw new OfflineQueuedError(resolvedHistId, queueId);
    }
    throw err;
  }
}

/**
 * Save a result selected from the Indo-Pacific manual key.
 *
 * A normal manual identification includes its image. A correction launched
 * from Flag Wrong Prediction references the previously saved CNN record and
 * therefore does not need to upload the image again.
 *
 * @param {File|null} imageFile
 * @param {string} scientificName
 * @param {string|null} title
 * @param {{
 *   sourceIdentificationId?: number|null,
 *   histId?: string|null,
 *   notes?: string|null,
 *   queueOffline?: boolean,
 *   latitude?: number|null,
 *   longitude?: number|null,
 * }} [options]
 */
export async function manualIdentifyImage(imageFile, scientificName, title, options = {}) {
  const {
    sourceIdentificationId = null,
    histId = null,
    notes = null,
    queueOffline = true,
    latitude,
    longitude,
  } = options;
  const coordinatesWereQueued = Object.prototype.hasOwnProperty.call(options, 'latitude')
    || Object.prototype.hasOwnProperty.call(options, 'longitude');
  const coordinates = sourceIdentificationId == null && imageFile
    ? (coordinatesWereQueued
      ? latitude != null && longitude != null ? { latitude, longitude } : null
      : await getImageOrDeviceCoordinates(imageFile))
    : null;
  const form = new FormData();
  form.append('scientific_name', scientificName);
  form.append('image_title', title ?? '');
  if (notes) form.append('notes', notes);

  if (sourceIdentificationId != null) {
    form.append('source_identification_id', String(sourceIdentificationId));
  } else if (imageFile) {
    form.append('image', imageFile);
    form.append('image_filename', imageFile.name);
    if (coordinates) {
      form.append('latitude', String(coordinates.latitude));
      form.append('longitude', String(coordinates.longitude));
    }
  } else {
    throw new Error('Select a photo before saving a manual identification.');
  }

  try {
    return await upload('/identifications/manual', form);
  } catch (err) {
    if (queueOffline && isOfflineError(err)) {
      const resolvedHistId = histId ?? crypto.randomUUID();
      const queueId = await enqueue({
        ...(imageFile ? {
          imageBlob: new Blob([await imageFile.arrayBuffer()], { type: imageFile.type }),
          fileName: imageFile.name,
        } : {}),
        title: title ?? null,
        modelType: null,
        histId: resolvedHistId,
        identificationMethod: 'manual_key',
        speciesName: scientificName,
        sourceIdentificationId,
        notes,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      });
      throw new OfflineQueuedError(resolvedHistId, queueId);
    }
    throw err;
  }
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

/**
 * Hard-delete ALL identification runs for the current admin user.
 */
export function deleteAllIdentifications() {
  return del('/identifications/delete-all');
}

/**
 * Hard-delete ALL identification runs for the current regular user.
 */
export function deleteAllUserIdentifications() {
  return del('/identifications/user-delete-all');
}

/**
 * Search the public seagrass catalog for a species by name.
 * The catalog endpoint is public (no auth) and matches on either
 * scientific_name or common_name. Returns the first active match,
 * or null on no match / error.
 *
 * @param  {string} scientificName
 * @returns {Promise<object|null>}
 */
export async function findCatalogMatch(scientificName) {
  if (!scientificName) return null;
  try {
    const data = await get(`/catalog?search=${encodeURIComponent(scientificName)}&limit=1&status=active`);
    return data.catalog?.[0] ?? null;
  } catch {
    return null;
  }
}
