/**
 * www/public/js/utils/assessment-queue.js
 *
 * Offline assessment queue backed by IndexedDB.
 *
 * When the device has no network connection the caller enqueues a save job;
 * when connectivity is restored (or on every page load) drainAssessments()
 * retries every pending job in order.
 *
 * ── Store shape ───────────────────────────────────────────────────────────────
 * DB name  : iseeAssessmentQueue
 * Store    : jobs
 * Key path : id  (auto-increment)
 *
 * Record   : {
 *   id          : number        (IDB key, auto)
 *   localId     : string        (crypto.randomUUID() — stable UI reference)
 *   userId      : number|null   (from localStorage isee_user)
 *   serverId    : number|null   (null = new record, number = existing record to update)
 *   title       : string
 *   content     : string        (HTML from the editor canvas)
 *   status      : 'draft' | 'in_progress' | 'finalized'
 *   enqueuedAt  : number        (Date.now())
 *   retries     : number        (incremented on each failed drain attempt)
 * }
 *
 * ── Exports ───────────────────────────────────────────────────────────────────
 *   enqueueAssessment(job)                              → Promise<number>  (IDB key)
 *   dequeueAssessment(id)                               → Promise<void>
 *   listQueuedAssessments()                             → Promise<Array>
 *   getQueuedAssessmentCount()                          → Promise<number>
 *   drainAssessments(createFn, updateFn, onResult)      → Promise<void>
 *   isOfflineError(err)                                 → boolean
 */

'use strict';

const DB_NAME    = 'iseeAssessmentQueue';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';
const MAX_RETRIES = 5;

// ── IDB helpers ───────────────────────────────────────────────────────────────

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
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
 * Add an assessment save job to the offline queue.
 *
 * @param {{
 *   localId   : string,
 *   serverId  : number|null,
 *   title     : string,
 *   content   : string,
 *   status    : string,
 * }} job
 * @returns {Promise<number>}  The IDB auto-generated key.
 */
export async function enqueueAssessment(job) {
  const stored = localStorage.getItem('isee_user');
  const userId = stored ? (JSON.parse(stored).id ?? null) : null;

  const store = await tx('readwrite');
  return idbRequest(store.add({
    localId    : job.localId,
    userId,
    serverId   : job.serverId ?? null,
    title      : job.title,
    content    : job.content ?? '',
    status     : job.status  ?? 'draft',
    enqueuedAt : Date.now(),
    retries    : 0,
  }));
}

/**
 * Remove a job from the queue (called after a successful sync).
 * @param {number} id  IDB key
 */
export async function dequeueAssessment(id) {
  const store = await tx('readwrite');
  return idbRequest(store.delete(id));
}

/**
 * Return all queued jobs ordered by enqueue time (ascending).
 * @returns {Promise<Array>}
 */
export async function listQueuedAssessments() {
  const store = await tx('readonly');
  const jobs  = await idbRequest(store.getAll());
  return jobs.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
}

/**
 * Return how many assessment jobs are currently in the queue.
 * @returns {Promise<number>}
 */
export async function getQueuedAssessmentCount() {
  const store = await tx('readonly');
  return idbRequest(store.count());
}

/**
 * Drain the queue: retry every pending job in chronological order.
 *
 * @param {function(data: object): Promise<object>} createFn
 *   createAssessment({ title, content, status }) — returns { id, … }
 *
 * @param {function(id: number, data: object): Promise<object>} updateFn
 *   updateAssessment(serverId, { title, content, status }) — returns { id, … }
 *
 * @param {function(localId: string, result: object|null, error: Error|null): void} onResult
 *   Called after each job attempt. result is the server record on success, null on failure.
 */
export async function drainAssessments(createFn, updateFn, onResult) {
  let jobs;
  try {
    jobs = await listQueuedAssessments();
  } catch {
    return; // IDB unavailable — silently bail
  }

  if (!jobs.length) return;

  for (const job of jobs) {
    // Stop draining if we've gone offline again mid-drain
    if (!navigator.onLine) break;

    try {
      let result;

      if (job.serverId) {
        // Existing record — update it
        result = await updateFn(job.serverId, {
          title   : job.title,
          content : job.content,
          status  : job.status,
        });
      } else {
        // New record — create it
        try {
          result = await createFn({
            title   : job.title,
            content : job.content,
            status  : job.status,
          });
        } catch (createErr) {
          // Title conflict (409) — append timestamp and retry once
          const isConflict =
            createErr.status === 409 ||
            (createErr.message || '').toLowerCase().includes('already exists');

          if (isConflict) {
            const stamp = new Date().toLocaleString('en-PH', {
              month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
            }).replace(/[/:, ]+/g, '-');
            const fallbackTitle = `${job.title} (${stamp})`;
            result = await createFn({
              title   : fallbackTitle,
              content : job.content,
              status  : job.status,
            });
          } else {
            throw createErr;
          }
        }
      }

      await dequeueAssessment(job.id);
      onResult(job.localId, result, null);

    } catch (err) {
      if (isOfflineError(err)) {
        // Still offline — stop here, leave the rest in the queue
        break;
      }

      // Server error — increment retry count
      const newRetries = (job.retries ?? 0) + 1;

      if (newRetries >= MAX_RETRIES) {
        // Permanently failed — remove and report
        await dequeueAssessment(job.id);
        onResult(job.localId, null, err);
      } else {
        try {
          const store = await tx('readwrite');
          await idbRequest(store.put({ ...job, retries: newRetries }));
        } catch {
          // IDB write failed — leave retry count as-is
        }
        onResult(job.localId, null, err);
      }
    }
  }
}

/**
 * Heuristic: distinguish a network-level failure (no connectivity) from a
 * server-side error (server reachable but returned an error status).
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
    (err instanceof TypeError && (
      msg.includes('fetch') ||
      msg.includes('network')
    ))
  );
}
