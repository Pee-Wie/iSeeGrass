# Assessment Save Fix — Summary

**File changed:** `www/public/js/users/editor/editor-api-sync.js`
**Files confirmed unchanged:** `www/public/js/users/editor/script-users-editor.js`

---

## Root cause

`wrapSaveButton()` called `btn.cloneNode(true)` + `btn.replaceWith(clone)`, which
destroyed the `addEventListener`-attached localStorage save handlers that
`script-users-editor.js::wireFooter()` had attached to the three footer buttons
(`btnSaveDraft`, `btnInProgress`, `btnFinalize`). The cloned button then dispatched
a `CustomEvent('isee:editor-save')` expecting the editor to handle it, but
`script-users-editor.js` never listened for that event. Result: clicking any save
button skipped localStorage entirely, triggered only `syncToApi()`, and any API
failure was silently swallowed — so saves appeared to do nothing.

---

## Changes made

### 1. Replaced `wrapSaveButton` with `bindSaveButton`

Removed the entire `wrapSaveButton` function (including the `cloneNode`/`replaceWith`
anti-pattern and the `CustomEvent` dispatch). Replaced with:

```js
function bindSaveButton(id, localStatus) {
  document.getElementById(id)?.addEventListener('click', () => {
    syncToApi(localStatus);
  });
}
```

This adds a second click listener on the original button node, leaving the existing
`script-users-editor.js` handlers intact. On click, both paths now run: localStorage
save (from `wireFooter`) and API sync (from `bindSaveButton`).

### 2. Updated the three call sites in `init()`

```js
bindSaveButton('btnSaveDraft',  'draft');
bindSaveButton('btnInProgress', 'in-progress');
bindSaveButton('btnFinalize',   'final');
```

### 3. Added error toast in `syncToApi()` catch block

Previously the catch block only called `console.warn`, leaving users with no
feedback when a cloud save failed. The catch block now also shows a visible toast
using the same `editorToast` element and `editor-toast--error` / `ti ti-alert-circle`
pattern used by `showToast()` in `script-users-editor.js`. Message: 
"Cloud save failed — your draft is saved locally." Auto-dismisses after 4 seconds.

### 4. Updated comment on the `isee:editor-save` listener

`isee:editor-save` was only ever dispatched by the now-removed `wrapSaveButton`.
Grep confirmed no other code in the repo dispatches it (Ctrl+S and auto-save both
call `saveDraft()` directly). The listener is kept as a supplemental hook for future
external integrations, with an updated comment clarifying it is not part of the
normal click/Ctrl+S/auto-save path.

---

## Verification checklist

- [x] No `cloneNode` calls on save buttons remain in `editor-api-sync.js`
- [x] `syncToApi` is reachable from button click via `bindSaveButton`
- [x] `syncToApi` remains reachable via the `isee:editor-save` event listener
- [x] `script-users-editor.js` `wireFooter` handlers are untouched
- [x] Error toast uses `editorToast` element, `editor-toast--error` class, `ti ti-alert-circle` icon — matching the existing `showToast()` pattern
