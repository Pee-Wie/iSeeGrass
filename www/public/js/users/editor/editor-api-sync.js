/**
 * www/public/js/users/editor/editor-api-sync.js
 *
 * API sync companion for the assessment editor.
 * Runs as a module after script-users-editor.js has loaded.
 *
 * What it does:
 *  - Intercepts the Save Draft / In Progress / Finalize footer buttons
 *    and also saves/updates the record in the database.
 *  - Loads the most-recent assessment from the API on page open
 *    (falls through to localStorage if the API fails or user is a guest).
 *  - Stores the current API record's ID in state so subsequent saves
 *    do PUT (update) instead of POST (create).
 *
 * It does NOT replace localStorage persistence; both run in parallel
 * so the editor remains usable even when offline or logged out.
 */

'use strict';

import { createAssessment, updateAssessment, listAssessments, getAssessment } from '../../api/assessments.api.js';
import { me } from '../../api/auth.api.js';

// The DB id of the assessment currently open in the editor.
// null = not yet saved to API; number = already synced.
let apiAssessmentId = null;

// Map the editor's local status keys to the API's enum values
const STATUS_MAP = {
  'draft':       'draft',
  'in-progress': 'in_progress',
  'final':       'finalized',
};

// ── Intercept footer save buttons ────────────────────────────────────────────

function getEditorState() {
  // Read from the live editor DOM (script-users-editor.js keeps these in scope
  // but doesn't expose them; we read from the DOM directly instead).
  const title   = document.getElementById('editorTitle')?.value?.trim() || 'Untitled';
  const canvas  = document.getElementById('editorCanvas');
  const content = canvas ? canvas.innerHTML : '';
  return { title, content };
}

async function syncToApi(localStatus) {
  const status = STATUS_MAP[localStatus] || 'draft';
  const { title, content } = getEditorState();

  try {
    if (apiAssessmentId) {
      // Update existing record
      await updateAssessment(apiAssessmentId, { title, content, status });
    } else {
      // Create new record
      const created    = await createAssessment({ title, content, status });
      apiAssessmentId  = created.id;
    }
  } catch (err) {
    // Non-fatal: localStorage save already happened; just log.
    console.warn('[editor-api-sync] API sync failed:', err.message);
    // Show a non-blocking error toast so the user knows the cloud save failed.
    // localStorage already persisted the save, so data is not lost.
    const toast = document.getElementById('editorToast');
    if (toast) {
      const icon = toast.querySelector('i');
      const text = toast.querySelector('span');
      toast.className = 'editor-toast editor-toast--error';
      if (icon) icon.className = 'ti ti-alert-circle';
      if (text) text.textContent = 'Cloud save failed — your draft is saved locally.';
      toast.hidden = false;
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => { toast.hidden = true; }, 4000);
    }
  }
}

function bindSaveButton(id, localStatus, guard) {
  document.getElementById(id)?.addEventListener('click', () => {
    // If a guard function is provided, skip the API sync when it returns false.
    // This mirrors any early-return checks already present in wireFooter's handler
    // for the same button (e.g. the empty-title check on btnFinalize).
    if (guard && !guard()) return;
    syncToApi(localStatus);
  });
}

// ── Load most-recent assessment from API on page open ────────────────────────

async function loadLatestFromApi() {
  try {
    const data = await listAssessments({ limit: 1, page: 1 });
    const rows = data.assessments || [];
    if (!rows.length) return;

    // Always fetch the full record so we can get the content and id.
    const full = await getAssessment(rows[0].id);

    // Always capture the DB id — this is the fix for the race condition.
    // Even if localStorage content is newer, we still need this id for PUT.
    apiAssessmentId = full.id;

    // Compare API record's updated_at with the localStorage draft's ts field.
    // loadDraft() (in script-users-editor.js) stores timestamps as `ts`.
    const titleEl  = document.getElementById('editorTitle');
    const canvasEl = document.getElementById('editorCanvas');

    // Read the most-recent localStorage draft to compare timestamps.
    // ASSESSMENTS_KEY ('iseeGrassAssessments') is defined in script-users-editor.js;
    // we replicate the key string here rather than importing it (same file-scope).
    let localTs = null;
    try {
      const raw = localStorage.getItem('iseeGrassAssessments');
      if (raw) {
        const list = JSON.parse(raw);
        if (list.length) localTs = list[0].ts || null;   // ISO string or null
      }
    } catch (_) { /* corrupt localStorage */ }

    const apiTs   = full.updated_at || full.created_at || null;
    const apiDate = apiTs   ? new Date(apiTs).getTime()   : 0;
    const locDate = localTs ? new Date(localTs).getTime() : 0;

    // API record wins when it's newer OR when there is no local draft.
    if (apiDate >= locDate) {
      if (titleEl)  titleEl.value      = full.title   || '';
      if (canvasEl) canvasEl.innerHTML = full.content || '';
    }
    // If local draft is strictly newer, loadDraft() already populated the
    // editor with the right content, so we just leave it in place.
    // Either way, apiAssessmentId is now set, so saves will use PUT.
  } catch {
    // Offline or guest — localStorage draft loaded by loadDraft() remains.
  }
}

// ── Listen for the custom event so we can sync when Ctrl+S fires too ─────────
// NOTE: isee:editor-save is currently only dispatched by external integrations.
// Ctrl+S and auto-save call saveDraft() directly (localStorage only); they do
// not dispatch this event. This listener is kept as a supplemental hook.
document.addEventListener('isee:editor-save', e => {
  syncToApi(e.detail?.status || 'draft');
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  // Only run if the user is authenticated
  try { await me(); } catch { return; }

  // Try to load the most recent assessment from the API
  // (DOMContentLoaded has already fired by the time this module runs)
  await loadLatestFromApi();

  // Bind the three footer save buttons.
  // btnFinalize mirrors the title guard from wireFooter in script-users-editor.js:
  // skip the API sync when the title is blank (same condition that blocks localStorage).
  bindSaveButton('btnSaveDraft',  'draft');
  bindSaveButton('btnInProgress', 'in-progress');
  bindSaveButton('btnFinalize',   'final', () =>
    !!document.getElementById('editorTitle')?.value?.trim()
  );
})();
