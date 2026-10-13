# Offline Photo Collector Persistence — Implementation Report

## Files Created

### `www/public/js/utils/photo-collector-store.js` (new)
IndexedDB utility module that persists staged photos across page navigation and app close.

## Files Modified

### `www/public/js/users/identify/script-users-identify.js`
Applied to the shared identify script used by both the admin and user pages.

## Files Not Touched
- `www/public/js/guest/photo-collector.js` — guest Aid page, explicitly excluded
- `www/public/js/utils/identify-queue.js` — left as-is
- Both HTML files already had `type="module"` — no changes needed

---

## IDB Schema

| Field        | Type     | Notes                                           |
|--------------|----------|-------------------------------------------------|
| `uuid`       | string   | Key path; generated with `crypto.randomUUID()` |
| `userId`     | number   | From `localStorage.isee_user.id`; all queries filter by this |
| `imageBlob`  | Blob     | Raw file bytes                                  |
| `mimeType`   | string   | e.g. `image/jpeg`                               |
| `originalName` | string | Base filename without extension                 |
| `label`      | string   | Current display label (may be renamed)          |
| `ext`        | string   | File extension including dot (e.g. `.jpg`)      |
| `addedAt`    | number   | `Date.now()` at time of add                     |

- **DB name:** `iseePhotoCollector`
- **Store name:** `photos`
- **IDB version:** 1
- No secondary indices (userId filter is done via `getAll` + JS filter)

---

## TTL Eviction Policy

Records are evicted on `restoreCollectorPhotos(userId)` before the surviving
photos are returned. Any record whose `addedAt` is older than **48 hours**
(`Date.now() - 48 * 60 * 60 * 1000`) is deleted from IDB during that call.

Eviction is lazy (triggered only on page load/restore) and scoped to the
current userId — other users' stale records are not affected on restore.

---

## Changes Made to `script-users-identify.js`

1. **Import** — added import of all five store functions after the existing imports.
2. **`getCollectorUserId()`** — helper added after imports; reads `isee_user.id` from localStorage.
3. **`addPhotos(files)`** — each entry now gets a `uuid` assigned before push; `saveCollectorPhoto` is called fire-and-forget.
4. **`startRename` commit closure** — after updating `entry.label`, calls `updateCollectorPhotoLabel` if `entry.uuid` is set.
5. **`removePhoto(url)`** — calls `removeCollectorPhoto` before the array filter while `entry` is still accessible.
6. **`clearAll()`** — calls `clearCollectorPhotos` at start (fire-and-forget).
7. **Collector identify button** — after a successful `identifyImage` result and `identifyHistory.update`, calls `clearCollectorPhotos` to purge the queue from IDB.
8. **Init section** — replaced bare `updateUI()` with an async IIFE that calls `restoreCollectorPhotos`, reconstructs `File` objects from stored Blobs, pushes entries into the `photos` array, calls `renderThumb` for each, then calls `updateUI()`. IDB unavailability is caught and treated as non-fatal (starts empty). The existing `tryDrainQueue()` call immediately after remains outside and unchanged.

---

## Caveats

- The direct-upload identify button (inside `renderDirectPreview`) is intentionally **not** cleared after a successful identification — per task spec, it is a separate flow from the collector.
- `clearCollectorPhotos` and `removeCollectorPhoto` on the collector identify success path run after the UI already reflects the result, so there is no race between IDB clearing and the photo being used for identification.
- Blobs stored in IDB count against `navigator.storage` quota. The 48-hour TTL and `clearAll` / per-identify-success clearing limit long-term accumulation.
