# Assessment Editor — Three Targeted Fixes

**Files changed**
- `www/public/js/users/editor/editor-api-sync.js`
- `www/public/js/users/editor/script-users-editor.js`

---

## Fix 1 — Race: `apiAssessmentId` null on early sidebar click (`editor-api-sync.js`)

**Problem:** The `isee:assessment-loaded` listener was synchronous. If the user
clicked a sidebar entry before `await loadLatestFromApi()` resolved,
`apiAssessmentsCache` was still empty, `find()` returned `undefined`, and
`apiAssessmentId` was set to `null` — so the next save fired POST instead of PUT,
causing a spurious 409 duplicate error.

**Fix:** Added a `cacheReadyPromise` / `apiCacheReady` gate at module scope.
`loadLatestFromApi()` calls `apiCacheReady()` at the end of both its success path
(after populating the cache) and its `catch` block (so a failed API load never
hangs the listener). The `isee:assessment-loaded` listener is now `async` and
`await cacheReadyPromise` before reading the cache.

---

## Fix 2 — Inline rename matches by `doc.id` instead of `doc.ts` (`script-users-editor.js`)

**Problem:** The inline-rename `commit` callback inside `refreshDocList` used
`all.findIndex(d => d.ts === doc.ts)` to locate the entry to update. Two entries
saved within the same millisecond could share the same `ts` value and collide.
`doc.id` (a UUID) is the authoritative identity key.

**Fix:** Changed the predicate to `d.id === doc.id`.

---

## Fix 3 — Unhandled rejection from `syncToApi` in `bindSaveButton` (`editor-api-sync.js`)

**Problem:** `bindSaveButton` called `syncToApi(localStatus)` without chaining
`.catch()`. `syncToApi` re-throws on a 409 conflict (after already displaying the
toast), producing an unhandled Promise rejection in the console.

**Fix:** Added `.catch(() => {})` at the callsite:
`syncToApi(localStatus).catch(() => {});  // error already shown via showEditorToast`
