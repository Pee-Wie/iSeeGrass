# Assessment Editor — DB-Only Persistence Rebuild

## Summary

Rebuilt the iSeeGrass Assessment Editor to use the database as the sole
persistence layer. All localStorage logic has been removed from both files.

## Files Changed

- `www/public/js/users/editor/script-users-editor.js`
- `www/public/js/users/editor/editor-api-sync.js`

---

## script-users-editor.js

### Removed
- `STORAGE_KEY`, `ASSESSMENTS_KEY`, `MAX_SAVED` constants
- `currentLocalId` variable
- `loadAssessments()`, `saveAssessments()`, `deduplicateAssessments()`
- `loadDraft()`, `saveWithStatus()`
- `btnDeleteAllAssessments` direct localStorage handler (now dispatches event)

### Changed
- `saveDraft()` — now dispatches `isee:save-requested { status: 'draft' }` instead of writing to localStorage.
- `clearDraft()` — removed localStorage calls; dispatches `isee:editor-cleared`.
- `applyTemplate()` — dispatches `isee:editor-cleared` after clearing the canvas.
- `wireFooter()` — `btnSaveDraft`, `btnInProgress`, `btnFinalize` all dispatch `isee:save-requested`. Download on finalize moved to `editor-api-sync.js`.
- `refreshDocList(assessments)` — now accepts a DB-records array parameter. Uses `doc.updated_at` for dates, `doc.status` ('draft'/'in_progress'/'finalized') for badges. All actions (load, delete, rename) dispatch custom events.
- `STATUS_META` updated to use API enum keys: `draft`, `in_progress`, `finalized`.
- `init()` — removed `loadDraft()` and `refreshDocList()` (no-arg) calls. Sidebar loading is handled by `editor-api-sync.js`. `btnDeleteAllAssessments` dispatches `isee:delete-all-assessments`.

---

## editor-api-sync.js (full rewrite)

### State
- `apiAssessmentId` — DB id of the currently open assessment (null = new).
- `assessmentsCache` — latest list from the API.

### Functions
- `showEditorToast(msg, type)` — toast helper targeting `#editorToast`.
- `getEditorState()` — reads `#editorTitle` and `#editorCanvas`.
- `loadAndRenderList()` — fetches list from API, stores in cache, calls `refreshDocList()`.
- `loadAssessmentIntoEditor(id)` — fetches full record, populates editor, sets `apiAssessmentId`.
- `syncToApi(localStatus)` — creates or updates based on `apiAssessmentId`. Title conflict check on new records. Auto-downloads on finalize.

### Event listeners
| Event | Action |
|---|---|
| `isee:save-requested` | `syncToApi(status)` |
| `isee:load-assessment` | `loadAssessmentIntoEditor(id)` |
| `isee:delete-assessment` | `deleteAssessment(id)` + clear editor if it's the open record |
| `isee:rename-assessment` | `updateAssessment(id, { title })` + conflict check |
| `isee:delete-all-assessments` | Delete all cached records, clear editor |
| `isee:editor-cleared` | `apiAssessmentId = null` |
| `isee:editor-save` | Supplemental hook for external integrations |

### Init IIFE
1. Calls `me()` — returns early for unauthenticated users.
2. Calls `loadAndRenderList()` to populate sidebar.
3. Calls `loadAssessmentIntoEditor(assessmentsCache[0].id)` to open the most-recent record.

---

## Verification Checklist

- [x] No `localStorage.getItem` / `localStorage.setItem` in either file
- [x] `refreshDocList` accepts array parameter, never calls `loadAssessments()`
- [x] Save Draft / In Progress / Finalize dispatch `isee:save-requested`
- [x] Ctrl+S → `saveDraft()` → `isee:save-requested` → `syncToApi`
- [x] Sidebar click dispatches `isee:load-assessment` → `loadAssessmentIntoEditor`
- [x] Delete dispatches `isee:delete-assessment` → `deleteAssessment` API call
- [x] Rename dispatches `isee:rename-assessment` → `updateAssessment` API call
- [x] No `cloneNode`/`replaceWith` on buttons
- [x] `apiAssessmentId` reset to null on clear / template / delete of current record
- [x] Title conflict shows error toast and does not save
