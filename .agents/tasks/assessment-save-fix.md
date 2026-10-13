# Assessment Save Fix — Change Summary

## Problem

The assessment editor intermittently failed to save because
`editor-api-sync.js::wrapSaveButton()` called `btn.cloneNode(true)` and replaced the
original DOM node. This destroyed the `addEventListener`-attached localStorage handlers
that `script-users-editor.js::wireFooter()` had registered on the three footer buttons.
A subsequent review round identified a secondary bug: even after the `cloneNode` fix,
the finalize button's API sync fired unconditionally — even when the title was blank and
`wireFooter`'s early-return guard had already blocked the localStorage save.

## Changes made

### `www/public/js/users/editor/editor-api-sync.js`

1. **Replaced `wrapSaveButton` with `bindSaveButton`**
   - Removed `cloneNode(true)` / `btn.replaceWith(clone)` entirely.
   - Replaced with `addEventListener` directly on the original node so existing
     `wireFooter` handlers are never disturbed.
   - Removed the `CustomEvent('isee:editor-save')` dispatch — it is no longer needed.

2. **Added title guard to `bindSaveButton`**
   - `bindSaveButton` now accepts an optional `guard` function.
   - The finalize button passes a guard that checks `editorTitle.value.trim()`,
     mirroring the same condition in `wireFooter`. If the guard returns false,
     `syncToApi` is skipped — preventing premature API finalization with an empty title.

3. **Error toast in `syncToApi` catch block**
   - On API failure, a visible error toast is shown using the same `editorToast`
     element, CSS classes (`editor-toast editor-toast--error`), and icon
     (`ti ti-alert-circle`) pattern used by `showToast()` in `script-users-editor.js`.
   - Message: "Cloud save failed — your draft is saved locally."
   - Auto-dismisses after 4 seconds.

4. **Updated `isee:editor-save` listener comment**
   - Clarified that this event is no longer dispatched by any application code.
   - The listener is retained as a supplemental hook for future external integrations.

### `www/public/js/users/editor/script-users-editor.js`

No changes. All existing `addEventListener` handlers on `btnSaveDraft`,
`btnInProgress`, and `btnFinalize` are untouched.

## Verification

- No `cloneNode` calls remain in `editor-api-sync.js`.
- `syncToApi` is reachable from button click (via `bindSaveButton`) and from the
  `isee:editor-save` supplemental listener.
- `script-users-editor.js` localStorage handlers are unmodified.
- Error toast uses the same element ID (`editorToast`) and CSS classes
  (`editor-toast editor-toast--error`) as the existing success toasts.
- Finalize button skips `syncToApi` when the title is blank, matching
  `wireFooter`'s guard behaviour.
