# Implementation Plan — Persistent Identification History Sidebar

**Goal:** Show the admin's identification history in the sidebar, persisted in the
database, with DB `id` as the sequence number, truncated filename, and the
matched `top_result` (scientific name). Confidence is stored as a decimal
0–100 (`DECIMAL(5,2)`) and displayed as-is (never forced to 100).

---

## Context snapshot (read before coding)

| Item | Value |
|---|---|
| Migration dir (note typo) | `database/migrattion/` |
| Migration style | `ALTER TABLE … ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` (see `007_add_model_type_to_identifications.sql`) |
| PHP response helpers | `jsonSuccess($data)` / `jsonError($msg, $status)` in `core/helpers/response.php` |
| Admin middleware | `require_once __DIR__ . '/../../app/middleware/require_admin.php'` — sets `$currentUser`, exits 403 if not admin |
| Auth middleware (non-admin) | `core/app/middleware/require_auth.php` |
| `getDB()` | `core/config/db.php` |
| `IdentificationModel` location | `core/app/models/IdentificationModel.php` |
| `getByUser(int $userId, int $limit, int $offset): array` | Returns `SELECT *` rows from `identifications` — will include `image_filename` after migration |
| JS API helpers | `get(path)` and `upload(path, formData)` exported from `www/public/js/api/client.js` |
| `apiUrl('/identifications/history')` resolves to | `http://localhost/iSeeGrass/core/api/identifications/history.php` |
| Sidebar component | `www/components/sidebar-users-identify.js` — `ISeeIdentifyHistory` custom element |
| Identify script | `www/public/js/users/identify/script-users-identify.js` |
| Identify API module | `www/public/js/api/identify.api.js` |
| `_truncateName(fileName)` | Already exists in the sidebar: base ≤ 10 chars → unchanged, else `base.slice(0,10) + '..' + ext` (ext without leading dot) |
| Confidence display | `top_confidence` is stored as percent (e.g. `94.75`); `capConfidence()` in script caps at 98 for display; sidebar uses it as-is |

---

## Step 1 — DB migration: add `image_filename` column

**What:** Create `009_add_image_filename_to_identifications.sql`. Adds
`image_filename VARCHAR(255) DEFAULT NULL` after `image_count`.
Match the style of `007_add_model_type_to_identifications.sql` exactly
(header comment block, safe-to-run-multiple-times note, single `ALTER TABLE`).

**File to create:**
```
database/migrattion/009_add_image_filename_to_identifications.sql
```

**Exact SQL body:**
```sql
-- ===== database/migrattion/009_add_image_filename_to_identifications.sql =====
--
-- Adds the `image_filename` column to the `identifications` table so each
-- identification run records the original filename of the uploaded image.
--
-- Safe to run multiple times (IF NOT EXISTS guard).
-- Run this against the `iseegrass` database in phpMyAdmin or via mysql CLI:
--
--   mysql -u root -p iseegrass < 009_add_image_filename_to_identifications.sql
--

ALTER TABLE identifications
    ADD COLUMN IF NOT EXISTS image_filename
        VARCHAR(255)
        DEFAULT NULL
        COMMENT 'Original filename of the uploaded image'
    AFTER image_count;
```

**Verify:** Run the SQL in phpMyAdmin against `iseegrass` DB; confirm
`SHOW COLUMNS FROM identifications` contains `image_filename` between
`image_count` and `top_result`. Running a second time must produce no error.

---

## Step 2 — Update `IdentificationModel::create()` — add `image_filename`

**What:** Add an optional `?string $imageFilename = null` parameter as the
**third** positional parameter (between `$imageCount` and `$topResult`).
Add it to the INSERT statement and the `execute()` bindings.

**File to modify:**
```
core/app/models/IdentificationModel.php
```

**New signature:**
```php
public function create(
    int     $userId,
    int     $imageCount     = 1,
    ?string $imageFilename  = null,   // ← NEW third param
    ?string $topResult      = null,
    ?float  $topConfidence  = null,
    ?string $modelType      = 'improved_original'
): int
```

**New INSERT (replace the existing one in `create()`):**
```php
$stmt = $this->pdo->prepare(
    'INSERT INTO identifications
       (user_id, image_count, image_filename, top_result, top_confidence, model_type)
     VALUES
       (:user_id, :image_count, :image_filename, :top_result, :top_confidence, :model_type)'
);
$stmt->execute([
    ':user_id'         => $userId,
    ':image_count'     => $imageCount,
    ':image_filename'  => $imageFilename,
    ':top_result'      => $topResult,
    ':top_confidence'  => $topConfidence,
    ':model_type'      => $modelType,
]);
```

> **Important:** `getByUser()` and `findById()` use `SELECT *`, so they will
> automatically return `image_filename` once the column exists — no changes needed
> to those methods.

**Verify:** PHP lint (`php -l core/app/models/IdentificationModel.php`) passes.
No other callers of `create()` pass more than 3 positional args, so the new
optional param is backward-compatible.

---

## Step 3 — Update `core/api/identify.php` — capture and pass `image_filename`

**What:** After the file-validation block (after `$modelType` is set, before
the temp-dir block), read `$_FILES['image']['name']`, sanitise it, and pass it
to `$model->create()`.

**File to modify:**
```
core/api/identify.php
```

**Add sanitisation** immediately after the `$modelType` declaration block
(around line 60, after `$modelType = $rawModelType;`):

```php
// ── Sanitise original filename ────────────────────────────────────────────────
$rawFilename = trim((string) ($_FILES['image']['name'] ?? ''));
$imageFilename = $rawFilename !== '' ? substr($rawFilename, 0, 255) : null;
```

**Update the `$model->create()` call** (currently ~line 166):
```php
// Before:
$identificationId = $model->create(
    (int) $currentUser['id'],
    1,               // image_count
    $topLabel,
    $topConfidence,
    $activeTrack     // model_type
);

// After:
$identificationId = $model->create(
    (int) $currentUser['id'],
    1,                // image_count
    $imageFilename,   // ← NEW third arg (matches new signature)
    $topLabel,
    $topConfidence,
    $activeTrack      // model_type
);
```

**Verify:** `php -l core/api/identify.php` passes. Make a test identification
via the UI (logged in), then `SELECT id, image_filename FROM identifications
ORDER BY id DESC LIMIT 1;` in phpMyAdmin — `image_filename` must be the
uploaded file's name, not NULL.

---

## Step 4 — New endpoint `core/api/identifications/history.php`

**What:** Create the directory `core/api/identifications/` and the file
`history.php`. Admin-only, GET only. Returns up to 50 records (default) for the
requesting admin user, newest first, with the fields the sidebar needs.

**File to create:**
```
core/api/identifications/history.php
```

**Full file content:**
```php
<?php
/**
 * GET /api/identifications/history
 *
 * Returns the identification history for the currently-authenticated admin user.
 * Admin-only — uses require_admin middleware (sets $currentUser, role === 'admin').
 *
 * Query params:
 *   limit  int  1–50   default 50
 *   offset int  ≥0     default 0
 *
 * Response 200:
 *   {
 *     "success": true,
 *     "data": {
 *       "records": [
 *         {
 *           "id":             42,
 *           "image_filename": "seagrass_sample.jpg",   // null if not captured
 *           "top_result":     "Halodule pinifolia",
 *           "top_confidence": 87.30,                   // percent 0–100
 *           "created_at":     "2025-01-15 10:32:00"
 *         },
 *         ...
 *       ],
 *       "total": 42
 *     }
 *   }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/IdentificationModel.php';

requireMethod('GET');

$limit  = min(50, max(1, (int) ($_GET['limit']  ?? 50)));
$offset = max(0,           (int) ($_GET['offset'] ?? 0));

$pdo   = getDB();
$model = new IdentificationModel($pdo);

$rows = $model->getByUser((int) $currentUser['id'], $limit, $offset);

// Return only the fields the sidebar needs
$records = array_map(static function (array $row): array {
    return [
        'id'             => (int)   $row['id'],
        'image_filename' => isset($row['image_filename']) && $row['image_filename'] !== ''
                                ? $row['image_filename']
                                : null,
        'top_result'     => $row['top_result']     ?? null,
        'top_confidence' => $row['top_confidence'] !== null
                                ? (float) $row['top_confidence']
                                : null,
        'created_at'     => $row['created_at'],
    ];
}, $rows);

jsonSuccess(['records' => $records, 'total' => count($records)]);
```

> **Pattern notes:**
> - `require_once` path depth: `history.php` is two levels below `core/` so the
>   path is `../../config/cors.php` (matches `core/api/assessments/index.php`
>   which uses `../../helpers/response.php`).
> - `setCorsHeaders()` is called by `cors.php` on include, matching every other
>   endpoint in the project. Confirm `core/config/cors.php` calls it on include
>   before proceeding (read that file if unsure).

**Verify:** `php -l core/api/identifications/history.php` passes.
With a logged-in admin session, `curl` or browser: `GET
http://localhost/iSeeGrass/core/api/identifications/history.php` → 200 JSON
with `records` array and `total`.

---

## Step 5 — Update `identify.api.js` — add `listIdentificationHistory()`

**What:** Add and export a new function that GETs from the new endpoint.
Import `get` from `client.js` (it's not currently imported here — only `upload`
is). Add `get` to the existing import.

**File to modify:**
```
www/public/js/api/identify.api.js
```

**Change the import line** (currently line 2):
```js
// Before:
import { upload } from './client.js';

// After:
import { get, upload } from './client.js';
```

**Add the new exported function** at the end of the file (after `identifyImage`):
```js
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
```

**Verify:** `php -l` is not applicable here. Visual check: import tree is
correct (`get` is now imported). The function will be exercised in step 7.

---

## Step 6 — Update `identifyImage()` — append `image_filename` to FormData

**What:** In `identifyImage()`, append the file's `.name` to the `FormData`
before calling `upload()`, so `$_FILES['image']['name']` is available
server-side. Note: `$_FILES['image']['name']` already carries the original
filename from the multipart upload, but appending it as an explicit field
matches the sanitisation added in Step 3 (`$_POST['image_filename']` … actually
re-read: Step 3 reads `$_FILES['image']['name']`, **not** `$_POST`).
Therefore this step only needs to verify the filename propagates correctly.
No change to FormData is needed for the server side. This step is
**only about passing `image_filename` as an explicit POST field** in case a
future engine strips the original multipart name.

**Decision:** `identify.php` already reads `$_FILES['image']['name']` which
the browser sets automatically during `form.append('image', imageFile)`.
No additional FormData field is required. **However**, the original task spec
says to append `image_filename` to FormData. Do both: append the explicit
field so it's unambiguous, and update `identify.php` to prefer
`$_POST['image_filename']` with `$_FILES['image']['name']` as fallback.

**File to modify:**
```
www/public/js/api/identify.api.js
```

**In `identifyImage()`**, after `form.append('model_type', track);`:
```js
// Before:
const form = new FormData();
form.append('image', imageFile);
form.append('model_type', track);
return upload('/identify', form);

// After:
const form = new FormData();
form.append('image', imageFile);
form.append('model_type', track);
form.append('image_filename', imageFile.name);   // ← NEW: explicit filename field
return upload('/identify', form);
```

**Update `identify.php`** — prefer `$_POST['image_filename']` over
`$_FILES['image']['name']`:
```php
// Replace the sanitisation block from Step 3 with:
$rawFilename = trim((string) ($_POST['image_filename'] ?? $_FILES['image']['name'] ?? ''));
$imageFilename = $rawFilename !== '' ? substr($rawFilename, 0, 255) : null;
```

**Verify:** `php -l core/api/identify.php` passes. After a test identification,
`SELECT image_filename FROM identifications ORDER BY id DESC LIMIT 1` returns
the exact filename of the image you uploaded (not the server-generated temp name
like `iseeg_abc123.jpg`).

---

## Step 7 — Update `sidebar-users-identify.js` — load persistent history

This is the largest step. Make all four sub-changes to
`www/components/sidebar-users-identify.js`:

### 7a — `connectedCallback()`: call `_loadHistory()` after DOM setup

At the **end** of `connectedCallback()`, after `window.identifyHistory = this;`,
add:

```js
// Load persistent history from the server (admin users only)
this._loadHistory();
```

### 7b — Add `_loadHistory()` method

Add this method to the class, after `connectedCallback()`:

```js
/**
 * Fetch persisted identification history from the API and populate the
 * sidebar with DB records. Called once on component mount.
 * Silently no-ops on network/auth errors (guests, non-admin users).
 */
async _loadHistory() {
  try {
    // Dynamically import to avoid a hard dependency for guest pages
    const { listIdentificationHistory } = await import('../api/identify.api.js');
    const data = await listIdentificationHistory({ limit: 50 });
    const records = data?.records ?? [];

    for (const rec of records) {
      this._pushPersisted(rec);
    }

    if (records.length > 0) {
      this._clearBtn.hidden = false;
      this._empty.hidden    = true;
    }
  } catch (_) {
    // Not admin, not logged in, or server unavailable — stay silent
  }
}
```

> **Import path note:** The sidebar component lives at
> `www/components/sidebar-users-identify.js`. The identify API module is at
> `www/public/js/api/identify.api.js`. The relative path from the component to
> the API module is `../public/js/api/identify.api.js`.
> Use exactly: `'../public/js/api/identify.api.js'`

### 7c — Add `_pushPersisted()` method

Add after `_loadHistory()`:

```js
/**
 * Insert a history card sourced from a DB record (no live thumbnail).
 * Uses the DB row `id` as `_seq` so the number is stable across reloads.
 *
 * @param {{ id:number, image_filename:string|null, top_result:string|null,
 *           top_confidence:number|null, created_at:string }} rec
 */
_pushPersisted(rec) {
  const entry = {
    id:         `db-${rec.id}`,          // unique string id for data-id attr
    dbId:       rec.id,                  // numeric DB id used as _seq
    _seq:       rec.id,                  // display number (#42, etc.)
    timestamp:  rec.created_at
                  ? new Date(rec.created_at).getTime()
                  : Date.now(),
    fileName:   rec.image_filename ?? '(unknown)',
    thumbUrl:   null,                    // no thumbnail for persisted records
    topSpecies: rec.top_result    ?? '—',
    confidence: rec.top_confidence ?? 0,
    status:     'done',
    errorMsg:   null,
  };

  this._records.push(entry);             // push to end (already newest-first from API)
  this._renderRecord(entry);
}
```

### 7d — Update `push()` to accept `dbId` and use it as `_seq`

The existing `push()` increments `this._counter`. When a `dbId` is supplied
(from a just-completed live identification), use the DB id as `_seq` instead:

```js
// Replace the existing push() method with:
push(entry) {
  if (entry.dbId != null) {
    entry._seq = entry.dbId;             // use DB id for stable numbering
  } else {
    this._counter = (this._counter || 0) + 1;
    entry._seq = this._counter;
  }
  this._records.unshift(entry);          // newest first
  this._renderRecord(entry);
  this._clearBtn.hidden = false;
  this._empty.hidden    = true;
}
```

### 7e — Update `_buildCard()` to handle `thumbUrl === null`

In `_buildCard()`, replace the thumbnail `<img>` block with a conditional that
shows a placeholder `<div>` when `thumbUrl` is null:

```js
// Replace this section in _buildCard():
//   <img class="hist-card__thumb" src="${entry.thumbUrl}" alt="${entry.fileName}" loading="lazy">
// With:

const thumbHtml = entry.thumbUrl
  ? `<img class="hist-card__thumb" src="${entry.thumbUrl}" alt="${entry.fileName}" loading="lazy">`
  : `<div class="hist-card__thumb hist-card__thumb--placeholder" aria-hidden="true"></div>`;
```

Update the `card.innerHTML` template in `_buildCard()` to use `${thumbHtml}`
instead of the hardcoded `<img>` tag.

### 7f — Update the session note text

In `connectedCallback()`, find:
```
Session only — history resets on page reload.
```
Replace with:
```
Last 50 identifications · newest first
```

**File to modify:** `www/components/sidebar-users-identify.js`

**Verify:** Load the identify page as admin. The sidebar should show history
cards from the DB immediately (no identification needed). Cards show `#42`,
`img-123456..jpg`, `Halodule pinifolia`. New identifications appear at the top
with the DB id as their sequence number. Cards from DB have the placeholder div
instead of a broken image.

---

## Step 8 — Update `script-users-identify.js` — pass `dbId` in both `push()` calls

**What:** The script calls `window.identifyHistory.push(...)` in two places
(the Photo Collector identify button handler and the Direct Upload button
handler). After a successful identification, `result.identification_id` is the
DB id. Pass it as `dbId` in the `update()` patch so `push()` can use it as
`_seq`.

**Clarification:** `push()` is called **before** the API call (status:
`'pending'`, `dbId` unknown). `update()` is called after. The `_seq` is already
set by `push()` at pending time. To use `dbId` as `_seq`, the pending card must
be updated once the result comes back.

**Revised approach** (matches the existing `update()` method which does
`Object.assign(rec, patch)` then `_refreshCard(id)`):

In both `identifyBtn` handler and the direct-upload `reuploadBtn` handler,
update the `update()` call on success to include `dbId`:

```js
// Before (both locations):
window.identifyHistory.update(histId, {
  topSpecies: result.top_result  || '—',
  confidence: result.top_confidence ?? (result.scores?.[0]?.confidence ?? 0),
  status:     'done',
});

// After (both locations):
window.identifyHistory.update(histId, {
  dbId:       result.identification_id ?? null,
  topSpecies: result.top_result  || '—',
  confidence: result.top_confidence ?? (result.scores?.[0]?.confidence ?? 0),
  status:     'done',
});
```

Also update `update()` in the sidebar to re-set `_seq` when `dbId` is patched in:

In `sidebar-users-identify.js`, find the `update()` method:
```js
update(id, patch) {
  const rec = this._records.find(r => r.id === id);
  if (!rec) return;
  Object.assign(rec, patch);
  this._refreshCard(id);
}
```
Extend it to update `_seq` when `dbId` arrives:
```js
update(id, patch) {
  const rec = this._records.find(r => r.id === id);
  if (!rec) return;
  Object.assign(rec, patch);
  if (patch.dbId != null) {
    rec._seq = patch.dbId;             // switch to stable DB id once known
  }
  this._refreshCard(id);
}
```

**Files to modify:**
```
www/public/js/users/identify/script-users-identify.js
www/components/sidebar-users-identify.js
```

**Verify:** Run an identification as admin. Observe the sidebar card's `#N`
number: it starts as a counter number (pending), then after the API responds
it flips to the actual DB `id` (e.g. `#47`). On page reload, the card shows
`#47` again (loaded from DB), confirming persistence and stable numbering.

---

## Dependency order

```
Step 1  (SQL migration)
  └─► Step 2  (model update)
        └─► Step 3  (identify.php update — uses new model signature)
              └─► Step 4  (history endpoint — reads new column via getByUser)
                    └─► Step 5  (JS API module — calls new endpoint)
                    └─► Step 6  (identifyImage — sends filename, relies on Step 3)
                          └─► Step 7  (sidebar — calls listIdentificationHistory, uses new push/update shape)
                                └─► Step 8  (identify script — passes dbId to sidebar)
```

Steps 5 and 6 can be done in parallel (both modify `identify.api.js` — do 5
first, then 6 in the same edit pass). Steps 7 and 8 both touch the sidebar; do
7 first, then 8.

---

## Files summary

| # | Action | File |
|---|--------|------|
| 1 | CREATE | `database/migrattion/009_add_image_filename_to_identifications.sql` |
| 2 | MODIFY | `core/app/models/IdentificationModel.php` |
| 3 | MODIFY | `core/api/identify.php` |
| 4 | CREATE | `core/api/identifications/history.php` |
| 5 | MODIFY | `www/public/js/api/identify.api.js` |
| 6 | MODIFY | `www/public/js/api/identify.api.js` (same file, same edit pass as 5) |
| 7 | MODIFY | `www/components/sidebar-users-identify.js` |
| 8 | MODIFY | `www/public/js/users/identify/script-users-identify.js` + `www/components/sidebar-users-identify.js` (update method) |

---

## Implementation result

**Completed:** All 8 steps implemented and committed (commit `1e8f7b5`).

- Migration ran successfully via PHP PDO; `image_filename VARCHAR(255)` confirmed between `image_count` and `top_result`.
- PHP lint passed for all 3 touched/created PHP files.
- `capConfidence()` logic and `_truncateName()` helper left untouched.
- Guest Aid.html and photo-collector.js not touched.
- Sidebar note updated to "Last 50 identifications · newest first".
- Placeholder `<div class="hist-card__thumb--placeholder">` renders grey background when no thumbnail (persisted records).
- DB IDs used as stable `#N` sequence numbers in sidebar cards.
