/**
 * www/public/js/utils/identify-queue.js
 *
 * Offline identification queue backed by IndexedDB.
 *
 * When the device has no network connection the caller enqueues a job;
 * when connectivity is restored (or on every page load) drain() retries
 * every queued job in order.
 *
 * ── Store shape ───────────────────────────────────────────────────────────────
 * DB name  : iseeIdentifyQueue
 * Store    : jobs
 * Key path : id  (auto-increment)
 *
 * Record   : {
 *   id          : number       (IDB key, auto)
 *   userId      : number|null  (from localStorage isee_user)
 *   imageBlob   : Blob         (the raw image file)
 *   fileName    : string
 *   title       : string|null
 *   modelType   : string|null  (engine track key, resolved at enqueue time)
 *   enqueuedAt  : number       (Date.now())
 *   retries     : number       (incremented on each failed drain attempt)
 *   histId      : string       (the crypto.randomUUID() used in the history UI)
 * }
 *
 * ── Exports ───────────────────────────────────────────────────────────────────
 *   enqueue(job)                     → Promise<number>  (IDB key)
 *   dequeue(id)                      → Promise<void>
 *   listQueued()                     → Promise<Array>
 *   drain(identifyFn, onResult)      → Promise<void>
 *   getQueueCount()                  → Promise<number>
 */

'use strict';

const DB_NAME    = 'iseeIdentifyQueue';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';
const MAX_RETRIES = 5;   // give up after this many consecutive network failures

// ── IDB helpers ───────────────────────────────────────────────────────────────

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db    = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
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
 * Add an identification job to the offline queue.
 *
 * @param {{
 *   imageBlob  : Blob,
 *   fileName   : string,
 *   title      : string|null,
 *   modelType  : string|null,
 *   histId     : string,
 * }} job
 * @returns {Promise<number>}  The IDB auto-generated key.
 */
export async function enqueue(job) {
  const stored = localStorage.getItem('isee_user');
  const userId = stored ? (JSON.parse(stored).id ?? null) : null;

  const store = await tx('readwrite');
  return idbRequest(store.add({
    userId,
    imageBlob  : job.imageBlob,
    fileName   : job.fileName,
    title      : job.title  ?? null,
    modelType  : job.modelType ?? null,
    enqueuedAt : Date.now(),
    retries    : 0,
    histId     : job.histId,
  }));
}

/**
 * Remove a job from the queue (called after a successful retry).
 * @param {number} id
 */
export async function dequeue(id) {
  const store = await tx('readwrite');
  return idbRequest(store.delete(id));
}

/**
 * Return all queued jobs ordered by enqueue time.
 * @returns {Promise<Array>}
 */
export async function listQueued() {
  const store = await tx('readonly');
  return idbRequest(store.getAll());
}

/**
 * Return how many jobs are currently in the queue.
 * @returns {Promise<number>}
 */
export async function getQueueCount() {
  const store = await tx('readonly');
  return idbRequest(store.count());
}

/**
 * Drain the queue: retry every pending job in order.
 *
 * @param {function(Blob, string|null, string|null, string): Promise<object>} identifyFn
 *   The real identifyImage(file, title, modelType, histId) function — passed in to
 *   avoid a circular import. histId is forwarded so re-queues reuse the same UUID.
 *
 * @param {function(string, object|null, Error|null, File|null): void} onResult
 *   Called after each job attempt with (histId, result|null, error|null, file|null).
 *   file is the reconstructed File object — pass it to loadDirectPhoto() so the
 *   image appears in the 75% panel when the result arrives.
 */
export async function drain(identifyFn, onResult) {
  let jobs;
  try {
    jobs = await listQueued();
  } catch {
    return; // IDB unavailable — silently bail
  }

  if (!jobs.length) return;

  for (const job of jobs) {
    // Stop draining if we've gone offline again mid-drain
    if (!navigator.onLine) break;

    try {
      const file   = new File([job.imageBlob], job.fileName, { type: job.imageBlob.type });
      // Pass job.histId as 4th arg so identifyImage can reuse the same UUID
      // if the network drops again mid-drain (prevents orphaned queue entries).
      const result = await identifyFn(file, job.title, job.modelType, job.histId);

      await dequeue(job.id);
      // Pass file as 4th arg so the caller can load it into the preview panel
      onResult(job.histId, result, null, file);

    } catch (err) {
      const isNetworkError = isOfflineError(err);

      if (isNetworkError) {
        // Still offline — stop here, leave the rest in the queue
        break;
      }

      // Server error (4xx/5xx) — increment retry count
      const newRetries = (job.retries ?? 0) + 1;

      if (newRetries >= MAX_RETRIES) {
        // Permanently failed — remove from queue and report error
        await dequeue(job.id);
        onResult(job.histId, null, err, null);
      } else {
        // Update retry count in IDB
        try {
          const store = await tx('readwrite');
          await idbRequest(store.put({ ...job, retries: newRetries }));
        } catch {
          // IDB write failed — leave retry count as-is
        }
        onResult(job.histId, null, err, null);
      }
    }
  }
}

/**
 * Heuristic to detect a network-level failure (no connectivity) vs a
 * server-side error (server reachable but returned an error status).
 *
 * Covers the following cases:
 *  - navigator.onLine is false (most reliable offline signal)
 *  - client.js wraps fetch() rejection → 'Network error — check your connection…'
 *  - Raw fetch() rejection on Chrome/Android → TypeError: 'Failed to fetch'
 *  - Raw fetch() rejection on Safari/WebKit  → TypeError: 'Load failed'
 *  - Capacitor/WebView specific              → 'net::ERR_INTERNET_DISCONNECTED'
 *  - Mid-disconnect race: fetch starts online, TCP drops mid-flight
 *    → same TypeError variants as above
 *
 * @param {Error} err
 * @returns {boolean}
 */
export function isOfflineError(err) {
  if (!err) return false;
  if (!navigator.onLine) return true;

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_network_changed') ||
    msg.includes('networkerror') ||
    // fetch() throws TypeError on connection-level failures
    (err instanceof TypeError && (
      msg.includes('fetch') ||
      msg.includes('network')
    ))
  );
}

/**
 * A sentinel error class thrown by identifyImage() when a job is
 * successfully queued (offline). Callers use `instanceof OfflineQueuedError`
 * to distinguish "queued" from "failed".
 */
export class OfflineQueuedError extends Error {
  /**
   * @param {string} histId  The history UUID that was queued.
   * @param {number} queueId The IDB key of the new queue entry.
   */
  constructor(histId, queueId) {
    super('No network — identification queued for retry.');
    this.name    = 'OfflineQueuedError';
    this.histId  = histId;
    this.queueId = queueId;
  }
}
