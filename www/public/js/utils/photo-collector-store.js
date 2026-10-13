/**
 * www/public/js/utils/photo-collector-store.js
 *
 * IndexedDB-backed staging store for the Photo Collector.
 * Persists photos across page navigation and app close for admin/user pages.
 * NOT used by the guest Aid page.
 *
 * ── Store shape ───────────────────────────────────────────────────────────────
 * DB name  : iseePhotoCollector
 * Store    : photos
 * Key path : uuid
 *
 * Record   : {
 *   uuid         : string   (crypto.randomUUID())
 *   userId       : number   (from localStorage isee_user.id — required for all queries)
 *   imageBlob    : Blob     (raw file bytes)
 *   mimeType     : string
 *   originalName : string
 *   label        : string   (current, possibly renamed, display label)
 *   ext          : string
 *   addedAt      : number   (Date.now())
 * }
 *
 * ── Exports ───────────────────────────────────────────────────────────────────
 *   saveCollectorPhoto(record)              → Promise<void>
 *   updateCollectorPhotoLabel(uuid, label)  → Promise<void>
 *   removeCollectorPhoto(uuid)              → Promise<void>
 *   clearCollectorPhotos(userId)            → Promise<void>
 *   restoreCollectorPhotos(userId)          → Promise<Array>  (sorted by addedAt asc)
 *
 * ── TTL eviction ──────────────────────────────────────────────────────────────
 * Records older than 48 hours are evicted on restoreCollectorPhotos() before
 * the surviving photos are returned. This keeps storage clean without a
 * separate background job.
 */

'use strict';

const DB_NAME    = 'iseePhotoCollector';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// ── IDB helpers ───────────────────────────────────────────────────────────────

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'uuid' });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = (e) => {
      reject(new Error('IDB open failed: ' + e.target.error));
    };
  });
}

function tx(mode) {
  return openDB().then(db => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upsert a photo record into the collector store.
 *
 * @param {{
 *   uuid:         string,
 *   userId:       number,
 *   imageBlob:    Blob,
 *   mimeType:     string,
 *   originalName: string,
 *   label:        string,
 *   ext:          string,
 *   addedAt:      number,
 * }} record
 * @returns {Promise<void>}
 */
export async function saveCollectorPhoto(record) {
  const store = await tx('readwrite');
  await idbRequest(store.put(record));
}

/**
 * Update only the label of an existing record.
 *
 * @param {string} uuid
 * @param {string} newLabel
 * @returns {Promise<void>}
 */
export async function updateCollectorPhotoLabel(uuid, newLabel) {
  const store = await tx('readwrite');
  const existing = await idbRequest(store.get(uuid));
  if (!existing) return;
  existing.label = newLabel;
  await idbRequest(store.put(existing));
}

/**
 * Delete one record by uuid.
 *
 * @param {string} uuid
 * @returns {Promise<void>}
 */
export async function removeCollectorPhoto(uuid) {
  const store = await tx('readwrite');
  await idbRequest(store.delete(uuid));
}

/**
 * Delete all records belonging to userId.
 * Uses getAll + filter because the key path is uuid, not userId.
 *
 * @param {number|null} userId
 * @returns {Promise<void>}
 */
export async function clearCollectorPhotos(userId) {
  if (userId === null || userId === undefined) return;

  const store = await tx('readwrite');
  const all   = await idbRequest(store.getAll());

  const deletes = all
    .filter(r => r.userId === userId)
    .map(r => idbRequest(store.delete(r.uuid)));

  await Promise.all(deletes);
}

/**
 * Return all records for userId sorted by addedAt ascending.
 * Before returning, evict any records older than 48 hours.
 *
 * @param {number|null} userId
 * @returns {Promise<Array>}
 */
export async function restoreCollectorPhotos(userId) {
  if (userId === null || userId === undefined) return [];

  const cutoff = Date.now() - TTL_MS;

  // Evict stale records for this user first
  const storeW = await tx('readwrite');
  const allW   = await idbRequest(storeW.getAll());

  const stale = allW.filter(r => r.userId === userId && r.addedAt < cutoff);
  if (stale.length) {
    // Open a fresh readwrite transaction for deletes (prior tx may have closed)
    const storeD = await tx('readwrite');
    await Promise.all(stale.map(r => idbRequest(storeD.delete(r.uuid))));
  }

  // Read surviving records
  const storeR  = await tx('readonly');
  const current = await idbRequest(storeR.getAll());

  return current
    .filter(r => r.userId === userId)
    .sort((a, b) => a.addedAt - b.addedAt);
}
