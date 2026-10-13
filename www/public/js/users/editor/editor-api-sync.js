/**
 * www/public/js/users/editor/editor-api-sync.js
 *
 * Database-only persistence controller for the assessment editor.
 * This module is the SOLE source of truth for assessment data.
 * localStorage is not used.
 *
 * Responsibilities:
 *  - Load the assessment list from the API and render the sidebar.
 *  - Save (create / update) via API on Save Draft / In Progress / Finalize.
 *  - Load a full record into the editor when the user clicks a sidebar item.
 *  - Delete single assessments and all assessments.
 *  - Handle inline renames from the sidebar.
 *  - Auto-save every 60 s when there are unsaved changes.
 */

'use strict';

import { createAssessment, updateAssessment, listAssessments, getAssessment, deleteAssessment } from '../../api/assessments.api.js';
import { me } from '../../api/auth.api.js';

/* ── State ───────────────────────────────────────────────────────── */

let apiAssessmentId = null;   // DB id of the assessment currently open in the editor
let assessmentsCache = [];    // latest list from the API (refreshed on save/load/delete)

/* ── Toast helper ────────────────────────────────────────────────── */

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

/* ── Read current editor DOM state ──────────────────────────────── */

function getEditorState() {
  const title   = document.getElementById('editorTitle')?.value?.trim() || '';
  const canvas  = document.getElementById('editorCanvas');
  const content = canvas ? canvas.innerHTML : '';
  return { title, content };
}

/* ── Fetch list from API and re-render sidebar ───────────────────── */

async function loadAndRenderList() {
  try {
    const data = await listAssessments({ limit: 50, page: 1 });
    assessmentsCache = data.assessments || [];
    refreshDocList(assessmentsCache);
  } catch {
    refreshDocList([]);
  }
}

/* ── Fetch a full record and populate the editor ─────────────────── */

async function loadAssessmentIntoEditor(id) {
  try {
    const full = await getAssessment(id);
    const titleEl  = document.getElementById('editorTitle');
    const canvasEl = document.getElementById('editorCanvas');
    if (titleEl)  titleEl.value      = full.title   || '';
    if (canvasEl) canvasEl.innerHTML = full.content || '';
    apiAssessmentId = full.id;
    markSaved();
    updateCounts();
    showEditorToast(`Loaded: ${full.title || 'Untitled'}`, 'success');
  } catch {
    showEditorToast('Failed to load assessment. Please try again.', 'error');
  }
}

/* ── Save to API ─────────────────────────────────────────────────── */

const STATUS_MAP = {
  'draft':       'draft',
  'in-progress': 'in_progress',
  'final':       'finalized',
};

async function syncToApi(localStatus) {
  const status = STATUS_MAP[localStatus] || 'draft';
  const { title, content } = getEditorState();

  if (!title) {
    showEditorToast('Please enter a title before saving.', 'error');
    document.getElementById('editorTitle')?.focus();
    return;
  }

  try {
    if (apiAssessmentId) {
      // Update the existing record (overwrite — same title is fine)
      await updateAssessment(apiAssessmentId, { title, content, status });
    } else {
      // Check cache for a title conflict before creating a new record
      const conflict = assessmentsCache.find(
        r => r.title.trim().toLowerCase() === title.toLowerCase()
      );
      if (conflict) {
        showEditorToast('An assessment with this title already exists.', 'error');
        return;
      }
      const created   = await createAssessment({ title, content, status });
      apiAssessmentId = created.id;
    }

    // Refresh sidebar and mark saved
    await loadAndRenderList();
    markSaved();

    const statusLabel = {
      draft:       'Draft saved',
      in_progress: 'Saved as In Progress',
      finalized:   'Assessment finalized!',
    };
    showEditorToast(statusLabel[status] || 'Saved', 'success');

    // Auto-download on finalize
    if (status === 'finalized') {
      const { title: t, content: c } = getEditorState();
      downloadDocument(t, c, 'final');
    }
  } catch (err) {
    const msg = err.message || '';
    const isConflict = err.status === 409 || msg.toLowerCase().includes('already exists');
    showEditorToast(
      isConflict
        ? 'An assessment with this title already exists.'
        : 'Save failed. Please try again.',
      'error'
    );
  }
}

/* ══════════════════════════════════════════════════════════════════
   Event listeners — all editor actions flow through custom events
   ══════════════════════════════════════════════════════════════════ */

// Save Draft / In Progress / Finalize buttons (and Ctrl+S via saveDraft())
document.addEventListener('isee:save-requested', e => {
  syncToApi(e.detail?.status || 'draft').catch(() => {});
});

// Sidebar row click — load full record into editor
document.addEventListener('isee:load-assessment', async e => {
  const id = e.detail?.id;
  if (!id) return;
  await loadAssessmentIntoEditor(id);
});

// Per-item delete button
document.addEventListener('isee:delete-assessment', async e => {
  const { id, title } = e.detail || {};
  if (!id) return;
  const ok = await modalConfirm(
    `Delete "${title || 'Untitled'}"?\nThis cannot be undone.`,
    'Delete Assessment',
    'Delete'
  );
  if (!ok) return;
  try {
    await deleteAssessment(id);
    if (apiAssessmentId === id) {
      apiAssessmentId = null;
      const titleEl  = document.getElementById('editorTitle');
      const canvasEl = document.getElementById('editorCanvas');
      if (titleEl)  titleEl.value      = '';
      if (canvasEl) canvasEl.innerHTML = '';
    }
    await loadAndRenderList();
    showEditorToast('Assessment deleted', 'success');
  } catch {
    showEditorToast('Delete failed. Please try again.', 'error');
  }
});

// Inline rename from sidebar
document.addEventListener('isee:rename-assessment', async e => {
  const { id, newTitle } = e.detail || {};
  if (!id || !newTitle) return;

  // Conflict check (exclude the record being renamed)
  const conflict = assessmentsCache.find(
    r => r.id !== id && r.title.trim().toLowerCase() === newTitle.trim().toLowerCase()
  );
  if (conflict) {
    showEditorToast('An assessment with this title already exists.', 'error');
    await loadAndRenderList(); // restore the old title in the sidebar
    return;
  }

  try {
    await updateAssessment(id, { title: newTitle });
    // Keep the editor title field in sync if this is the open record
    if (apiAssessmentId === id) {
      const titleEl = document.getElementById('editorTitle');
      if (titleEl) titleEl.value = newTitle;
    }
    await loadAndRenderList();
  } catch (err) {
    const isConflict = (err.status === 409) || (err.message || '').toLowerCase().includes('already exists');
    showEditorToast(
      isConflict ? 'An assessment with this title already exists.' : 'Rename failed.',
      'error'
    );
    await loadAndRenderList();
  }
});

// Delete all assessments
document.addEventListener('isee:delete-all-assessments', async () => {
  const count = assessmentsCache.length;
  if (!count) return;
  const ok = await modalConfirm(
    `This will permanently delete all ${count} saved assessment${count !== 1 ? 's' : ''}.\nThis cannot be undone.`,
    'Delete All Assessments',
    'Delete All'
  );
  if (!ok) return;
  try {
    await Promise.all(assessmentsCache.map(r => deleteAssessment(r.id)));
    apiAssessmentId = null;
    assessmentsCache = [];
    const titleEl  = document.getElementById('editorTitle');
    const canvasEl = document.getElementById('editorCanvas');
    if (titleEl)  titleEl.value      = '';
    if (canvasEl) canvasEl.innerHTML = '';
    refreshDocList([]);
    showEditorToast('All assessments deleted', 'success');
  } catch {
    showEditorToast('Delete failed. Please try again.', 'error');
  }
});

// Editor cleared (Clear button or template load) — reset the open-record tracker
document.addEventListener('isee:editor-cleared', () => {
  apiAssessmentId = null;
});

// Supplemental hook for external integrations
document.addEventListener('isee:editor-save', e => {
  syncToApi(e.detail?.status || 'draft').catch(() => {});
});

/* ── Init ────────────────────────────────────────────────────────── */

(async function init() {
  // Only run for authenticated users
  try { await me(); } catch { return; }

  // Load the list and populate the sidebar
  await loadAndRenderList();

  // Open the most-recent assessment in the editor on page load
  if (assessmentsCache.length) {
    await loadAssessmentIntoEditor(assessmentsCache[0].id);
  }
})();
