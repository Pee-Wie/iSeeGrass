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
 * Photos remain stored until the user removes them or clears the collection.
 */

'use strict';

const DB_NAME    = 'iseePhotoCollector';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

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

function transactionDone(store) {
  return new Promise((resolve, reject) => {
    const transaction = store.transaction;
    transaction.addEventListener('complete', resolve, { once: true });
    transaction.addEventListener('abort', () => {
      reject(transaction.error || new Error('IndexedDB transaction aborted.'));
    }, { once: true });
    transaction.addEventListener('error', () => {
      reject(transaction.error || new Error('IndexedDB transaction failed.'));
    }, { once: true });
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upsert a photo record into the collector store.
 *
 * @param {{
 *   uuid:         string,
 *   userId:       number|string,
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
  if (record.userId === null || record.userId === undefined) {
    throw new Error('A signed-in user is required to save collection photos.');
  }

  const store = await tx('readwrite');
  await Promise.all([
    idbRequest(store.put({ ...record, userId: String(record.userId) })),
    transactionDone(store),
  ]);
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
  const completed = transactionDone(store).then(
    () => null,
    error => error,
  );
  const existing = await idbRequest(store.get(uuid));
  if (existing) {
    existing.label = newLabel;
    await idbRequest(store.put(existing));
  }
  const transactionError = await completed;
  if (transactionError) throw transactionError;
}

/**
 * Delete one record by uuid.
 *
 * @param {string} uuid
 * @returns {Promise<void>}
 */
export async function removeCollectorPhoto(uuid) {
  const store = await tx('readwrite');
  await Promise.all([
    idbRequest(store.delete(uuid)),
    transactionDone(store),
  ]);
}

/**
 * Delete all records belonging to userId.
 * Uses getAll + filter because the key path is uuid, not userId.
 *
 * @param {number|string|null} userId
 * @returns {Promise<void>}
 */
export async function clearCollectorPhotos(userId) {
  if (userId === null || userId === undefined) return;

  const store = await tx('readwrite');
  const completed = transactionDone(store);
  const allRequest = store.getAll();
  allRequest.addEventListener('success', () => {
    allRequest.result
      .filter(record => String(record.userId) === String(userId))
      .forEach(record => store.delete(record.uuid));
  }, { once: true });
  await Promise.all([idbRequest(allRequest), completed]);
}

/**
 * Return all records for userId sorted by addedAt ascending.
 *
 * @param {number|string|null} userId
 * @returns {Promise<Array>}
 */
export async function restoreCollectorPhotos(userId) {
  if (userId === null || userId === undefined) return [];

  const store = await tx('readonly');
  const [current] = await Promise.all([
    idbRequest(store.getAll()),
    transactionDone(store),
  ]);

  return current
    .filter(r => String(r.userId) === String(userId))
    .sort((a, b) => a.addedAt - b.addedAt);
}
