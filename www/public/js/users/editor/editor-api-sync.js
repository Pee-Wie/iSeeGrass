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

let apiAssessmentsCache = [];   // [{id, title, updated_at, ...}]

// Gate: resolves once apiAssessmentsCache has been populated (or the load fails).
// This prevents the isee:assessment-loaded listener from reading the cache before
// loadLatestFromApi() has finished, which would cause apiAssessmentId to stay null
// and trigger a spurious POST (duplicate) instead of a PUT (update).
let apiCacheReady;
const cacheReadyPromise = new Promise(resolve => { apiCacheReady = resolve; });

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
      // Update the existing record
      await updateAssessment(apiAssessmentId, { title, content, status });
    } else {
      // Check if a record with this title already exists for this user
      const conflict = apiAssessmentsCache.find(
        r => r.title.trim().toLowerCase() === title.toLowerCase()
      );
      if (conflict) {
        // Treat it as an update — adopt the existing record's id
        apiAssessmentId = conflict.id;
        await updateAssessment(apiAssessmentId, { title, content, status });
      } else {
        // Genuinely new — create
        const created   = await createAssessment({ title, content, status });
        apiAssessmentId = created.id;
        // Add to cache so future saves in this session use PUT
        apiAssessmentsCache.push(created);
      }
    }
    // Keep cache entry in sync
    const cacheIdx = apiAssessmentsCache.findIndex(r => r.id === apiAssessmentId);
    if (cacheIdx !== -1) apiAssessmentsCache[cacheIdx] = { ...apiAssessmentsCache[cacheIdx], title, status };
  } catch (err) {
    console.warn('[editor-api-sync] API sync failed:', err.message);
    // Check if the error is a 409 title conflict from the server
    const msg = err.message || '';
    const isConflict = err.status === 409 || msg.toLowerCase().includes('already exists');
    const toastMsg = isConflict
      ? 'An assessment with this title already exists.'
      : 'Cloud save failed — your draft is saved locally.';
    showEditorToast(toastMsg, 'error');
    // If it's a title conflict, also block by throwing
    if (isConflict) throw err;
  }
}

function showEditorToast(msg, type = 'error') {
  const toast = document.getElementById('editorToast');
  if (!toast) return;
  const icon = toast.querySelector('i');
  const text = toast.querySelector('span');
  toast.className = `editor-toast editor-toast--${type}`;
  if (icon) icon.className = type === 'success' ? 'ti ti-circle-check' : 'ti ti-alert-circle';
  if (text) text.textContent = msg;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, 4000);
}

function bindSaveButton(id, localStatus, guard) {
  document.getElementById(id)?.addEventListener('click', () => {
    // If a guard function is provided, skip the API sync when it returns false.
    // This mirrors any early-return checks already present in wireFooter's handler
    // for the same button (e.g. the empty-title check on btnFinalize).
    if (guard && !guard()) return;
    syncToApi(localStatus).catch(() => {});  // error already shown via showEditorToast
  });
}

// ── Load most-recent assessment from API on page open ────────────────────────

async function loadLatestFromApi() {
  try {
    const data = await listAssessments({ limit: 50, page: 1 });
    apiAssessmentsCache = data.assessments || [];
    apiCacheReady();  // cache is populated — unblock the isee:assessment-loaded listener
    if (!apiAssessmentsCache.length) return;

    const titleEl  = document.getElementById('editorTitle');
    const canvasEl = document.getElementById('editorCanvas');
    const currentTitle = titleEl?.value?.trim() || '';

    // Try to find an API record matching the currently loaded title
    const match = currentTitle
      ? apiAssessmentsCache.find(r => r.title.trim().toLowerCase() === currentTitle.toLowerCase())
      : null;

    const candidate = match || apiAssessmentsCache[0];

    // Always capture the DB id so saves use PUT
    apiAssessmentId = candidate.id;

    // Only overwrite the editor if the API version is strictly newer
    const full = await getAssessment(candidate.id);
    apiAssessmentId = full.id;   // confirm with full record

    let localTs = null;
    try {
      const raw = localStorage.getItem('iseeGrassAssessments');
      if (raw) {
        const list = JSON.parse(raw);
        const localMatch = currentTitle
          ? list.find(e => e.title?.trim().toLowerCase() === currentTitle.toLowerCase())
          : list[0];
        if (localMatch) localTs = localMatch.ts || null;
      }
    } catch (_) {}

    const apiDate = full.updated_at ? new Date(full.updated_at).getTime() : 0;
    const locDate = localTs ? new Date(localTs).getTime() : 0;

    if (apiDate > locDate) {
      if (titleEl)  titleEl.value      = full.title   || '';
      if (canvasEl) canvasEl.innerHTML = full.content || '';
    }
  } catch {
    // Offline or unauthenticated — localStorage draft is fine
    apiCacheReady();  // resolve even on failure so the listener never hangs
  }
}

// ── Listen for sidebar load events so apiAssessmentId stays in sync ──────────
document.addEventListener('isee:assessment-loaded', async e => {
  await cacheReadyPromise;  // don't read the cache until loadLatestFromApi() has finished
  const { title } = e.detail || {};
  if (!title) { apiAssessmentId = null; return; }
  const match = apiAssessmentsCache.find(
    r => r.title.trim().toLowerCase() === title.trim().toLowerCase()
  );
  apiAssessmentId = match ? match.id : null;
});

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
