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

import { createAssessment, updateAssessment, listAssessments } from '../../api/assessments.api.js';
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

function bindSaveButton(id, localStatus) {
  document.getElementById(id)?.addEventListener('click', () => {
    syncToApi(localStatus);
  });
}

// ── Load most-recent assessment from API on page open ────────────────────────

async function loadLatestFromApi() {
  try {
    const data = await listAssessments({ limit: 1, page: 1 });
    const rows = data.assessments || [];
    if (!rows.length) return;

    const latest = rows[0];
    // Only populate the editor if it's currently empty (title + canvas blank)
    const title   = document.getElementById('editorTitle');
    const canvas  = document.getElementById('editorCanvas');
    if (title && !title.value.trim() && canvas && !canvas.innerText.trim()) {
      // Fetch the full record (with content)
      const { getAssessment } = await import('../../api/assessments.api.js');
      const full = await getAssessment(latest.id);
      title.value        = full.title   || '';
      canvas.innerHTML   = full.content || '';
      apiAssessmentId    = full.id;
    }
  } catch {
    // Offline / guest — localStorage draft remains
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

  // Bind the three footer save buttons
  bindSaveButton('btnSaveDraft',  'draft');
  bindSaveButton('btnInProgress', 'in-progress');
  bindSaveButton('btnFinalize',   'final');
})();
