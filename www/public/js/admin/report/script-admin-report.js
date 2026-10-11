/**
 * Admin — Reports page
 * Handles: Seagrass Catalog CRUD, platform stats (placeholder counts),
 *          and CNN taxonomy engine track selection.
 */
'use strict';

import { listCatalog, createCatalogEntry, updateCatalogEntry, deleteCatalogEntry } from '../../api/catalog.api.js';
import { getEngineTrack, setEngineTrack } from '../../api/settings.api.js';

// ── Catalog state ─────────────────────────────────────────────────────────────
let catalogEntries = [];
let editingId      = null;   // null = create mode, int = edit mode

// ── DOM refs ──────────────────────────────────────────────────────────────────
const catalogBody   = document.getElementById('catalogTableBody');
const catalogSearch = document.getElementById('catalogSearch');
const catalogModal  = document.getElementById('catalogModal');
const deleteModal   = document.getElementById('deleteConfirmModal');

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toast(msg, ok = true) {
  let el = document.getElementById('adminToast');
  if (!el) { el = document.createElement('div'); el.id = 'adminToast'; el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:.75rem 1.25rem;border-radius:8px;font-size:.9rem;color:#fff;'; document.body.appendChild(el); }
  el.textContent = msg; el.style.background = ok ? '#4a8c2b' : '#b00'; el.style.opacity = '1';
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

// ── Load catalog ──────────────────────────────────────────────────────────────
async function loadCatalog(search = '') {
  catalogBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem">Loading…</td></tr>';
  try {
    const data = await listCatalog({ search, limit: 200 });
    catalogEntries = data.catalog || [];
    renderCatalog(catalogEntries);
  } catch (err) {
    catalogBody.innerHTML = `<tr><td colspan="8" style="color:#b00;text-align:center;padding:2rem">${esc(err.message)}</td></tr>`;
  }
}

function renderCatalog(entries) {
  if (!entries.length) {
    catalogBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem">No species found.</td></tr>';
    return;
  }
  catalogBody.innerHTML = entries.map((e, i) => {
    let regionCell;
    try {
      const ph = typeof e.ph_regions === 'string' ? JSON.parse(e.ph_regions) : (e.ph_regions || []);
      if (Array.isArray(ph) && ph.length > 0) {
        const map = { luzon: 'L', visayas: 'V', mindanao: 'M' };
        regionCell = ph.map(r => `<span class="badge badge-region">${map[r] || r}</span>`).join(' ');
      } else {
        regionCell = esc(e.region || '\u2014');
      }
    } catch { regionCell = esc(e.region || '\u2014'); }

    return `
    <tr data-id="${e.id}">
      <td>${i + 1}</td>
      <td>${esc(e.common_name || '—')}</td>
      <td>${esc(e.scientific_name)}</td>
      <td>${esc(e.family || '—')}</td>
      <td>${esc(e.genus || '—')}</td>
      <td>${regionCell}</td>
      <td>${e.status === 'active' ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-muted">Inactive</span>'}</td>
      <td>
        <div class="action-btn-group">
          <button class="admin-btn admin-btn--icon btn-edit" data-id="${e.id}" title="Edit"><i class="ti ti-edit"></i></button>
          <button class="admin-btn admin-btn--icon admin-btn--danger btn-del" data-id="${e.id}" data-name="${esc(e.scientific_name)}" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  catalogBody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id))));
  catalogBody.querySelectorAll('.btn-del').forEach(btn  => btn.addEventListener('click', () => openDeleteConfirm(parseInt(btn.dataset.id), btn.dataset.name)));
}

// ── Search ────────────────────────────────────────────────────────────────────
let searchTimer;
catalogSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadCatalog(catalogSearch.value.trim()), 350);
});

// ── Catalog modal helpers ─────────────────────────────────────────────────────
function getFormValues() {
  return {
    scientific_name: document.getElementById('fldScientific').value.trim(),
    common_name:     document.getElementById('fldCommon').value.trim()     || null,
    family:          document.getElementById('fldFamily').value.trim()     || null,
    region:          document.getElementById('fldRegion').value.trim()     || null,
    description:     document.getElementById('fldDescription').value.trim()|| null,
    status:          document.getElementById('fldStatus').value,
    in_cnn_scope:    document.getElementById('fldCnnScope').checked ? 1 : 0,
  };
}

function fillForm(entry) {
  document.getElementById('fldScientific').value   = entry.scientific_name || '';
  document.getElementById('fldCommon').value       = entry.common_name     || '';
  document.getElementById('fldFamily').value       = entry.family          || '';
  document.getElementById('fldRegion').value       = entry.region          || 'Negros';
  document.getElementById('fldDescription').value  = entry.description     || '';
  document.getElementById('fldStatus').value       = entry.status          || 'active';
  document.getElementById('fldCnnScope').checked   = !!parseInt(entry.in_cnn_scope);
}

// openCatalogModal(null) = add, called from HTML onclick
window.openCatalogModal = function(btn) {
  if (btn) {
    // edit mode - called from old inline onclick; find entry by row
    const row   = btn.closest('tr');
    const id    = parseInt(row.dataset.id);
    openEditModal(id);
  } else {
    // add mode
    editingId = null;
    document.getElementById('catalogModalTitle').textContent = 'Add Species';
    document.getElementById('catalogForm').reset();
    document.getElementById('fldRegion').value = 'Negros';
    catalogModal.hidden = false;
  }
};

function openEditModal(id) {
  const entry = catalogEntries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  document.getElementById('catalogModalTitle').textContent = 'Edit Species';
  fillForm(entry);
  catalogModal.hidden = false;
}

window.closeCatalogModal = function() { catalogModal.hidden = true; editingId = null; };

window.saveCatalogEntry = async function() {
  const values = getFormValues();
  if (!values.scientific_name) { toast('Scientific name is required.', false); return; }

  // Auto-generate slug from scientific name
  if (!editingId) {
    values.slug = values.scientific_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  try {
    if (editingId) {
      await updateCatalogEntry(editingId, values);
      toast('Species updated.');
    } else {
      await createCatalogEntry(values);
      toast('Species added.');
    }
    window.closeCatalogModal();
    loadCatalog(catalogSearch.value.trim());
  } catch (err) { toast(err.message, false); }
};

// ── Delete confirm ────────────────────────────────────────────────────────────
let _deleteId = null;

// Called from old inline onclick AND from dynamic buttons
window.openDeleteConfirm = function(idOrBtn, name) {
  if (typeof idOrBtn === 'object' && idOrBtn !== null) {
    // legacy inline call with btn element
    const row = idOrBtn.closest('tr');
    _deleteId = parseInt(row.dataset.id);
    document.getElementById('deleteSpeciesName').textContent = row.cells[1].textContent.trim();
  } else {
    _deleteId = idOrBtn;
    document.getElementById('deleteSpeciesName').textContent = name || '';
  }
  deleteModal.hidden = false;
};

function openDeleteConfirm(id, name) { window.openDeleteConfirm(id, name); }

window.closeDeleteConfirm = function() { deleteModal.hidden = true; _deleteId = null; };

window.confirmDelete = async function() {
  if (!_deleteId) return;
  try {
    await deleteCatalogEntry(_deleteId);
    toast('Species deleted.');
    window.closeDeleteConfirm();
    loadCatalog(catalogSearch.value.trim());
  } catch (err) { toast(err.message, false); }
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { window.closeCatalogModal(); window.closeDeleteConfirm(); }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadCatalog();

// ══════════════════════════════════════════════════════════════════════════════
// Engine Track Tab
// ══════════════════════════════════════════════════════════════════════════════

const TRACK_LABELS = {
  original:          'Original (morphological)',
  improved_original: 'Scientific Names',
  '6_species_proto': '6-Species Prototype',
};

/** Track that is saved in the DB — used to detect unsaved changes. */
let _savedTrack   = null;
/** Track currently selected in the UI (may differ from saved). */
let _selectedTrack = null;

const btnSaveEngine   = document.getElementById('btnSaveEngine');
const engineSaveHint  = document.getElementById('engineSaveHint');
const engineStatusText = document.getElementById('engineStatusText');
const engineStatusDot  = document.querySelector('.engine-status-dot');

// ── Load current setting from API ─────────────────────────────────────────────
async function loadEngineTrack() {
  setEngineStatus('loading');
  try {
    const data  = await getEngineTrack();
    const track = data.engine_track ?? 'improved_original';
    _savedTrack    = track;
    _selectedTrack = track;
    applyEngineSelection(track);
    setEngineStatus('saved', track);
  } catch (err) {
    setEngineStatus('error');
    toast('Could not load engine track: ' + err.message, false);
  }
}

// ── Apply a track value to the radio UI ──────────────────────────────────────
function applyEngineSelection(track) {
  // Check the matching radio
  const radio = document.querySelector(
    `input[name="admin_engine_track"][value="${CSS.escape(track)}"]`
  );
  if (radio) radio.checked = true;

  // Add/remove .is-selected on all cards
  document.querySelectorAll('.engine-track-card').forEach(card => {
    card.classList.toggle('is-selected', card.dataset.track === track);
  });
}

// ── Status pill helpers ───────────────────────────────────────────────────────
function setEngineStatus(state, track) {
  const pill = document.getElementById('engineActiveStatus');
  pill.className = 'engine-active-status';   // reset

  if (state === 'loading') {
    pill.classList.add('engine-active-status--loading');
    engineStatusText.textContent = 'Loading…';
  } else if (state === 'saved') {
    pill.classList.add('engine-active-status--active');
    engineStatusText.textContent = `Active: ${TRACK_LABELS[track] ?? track}`;
  } else if (state === 'unsaved') {
    pill.classList.add('engine-active-status--unsaved');
    engineStatusText.textContent = `Unsaved — currently: ${TRACK_LABELS[_savedTrack] ?? _savedTrack}`;
  } else if (state === 'saving') {
    pill.classList.add('engine-active-status--loading');
    engineStatusText.textContent = 'Saving…';
  } else {
    pill.classList.add('engine-active-status--error');
    engineStatusText.textContent = 'Error loading setting';
  }
}

function updateSaveButton() {
  const isDirty = _selectedTrack !== _savedTrack;
  btnSaveEngine.disabled = !isDirty;
  if (isDirty) {
    engineSaveHint.textContent = `Switching to: ${TRACK_LABELS[_selectedTrack] ?? _selectedTrack}`;
    engineSaveHint.className   = 'engine-save-hint engine-save-hint--pending';
    setEngineStatus('unsaved');
  } else {
    engineSaveHint.textContent = '';
    engineSaveHint.className   = 'engine-save-hint';
  }
}

// ── Wire radio changes ────────────────────────────────────────────────────────
document.querySelectorAll('input[name="admin_engine_track"]').forEach(radio => {
  radio.addEventListener('change', () => {
    _selectedTrack = radio.value;
    applyEngineSelection(_selectedTrack);
    updateSaveButton();
  });
});

// Also make the whole card label clickable (it wraps the radio — native, no JS needed)
// But sync .is-selected visually on label click for instant feedback
document.querySelectorAll('.engine-track-card').forEach(card => {
  card.addEventListener('click', () => {
    const track = card.dataset.track;
    if (!track) return;
    _selectedTrack = track;
    applyEngineSelection(track);
    updateSaveButton();
  });
});

// ── Save ──────────────────────────────────────────────────────────────────────
btnSaveEngine.addEventListener('click', async () => {
  if (!_selectedTrack || _selectedTrack === _savedTrack) return;

  btnSaveEngine.disabled = true;
  setEngineStatus('saving');

  try {
    const data = await setEngineTrack(_selectedTrack);
    _savedTrack = data.engine_track ?? _selectedTrack;
    engineSaveHint.textContent = '';
    engineSaveHint.className   = 'engine-save-hint';
    setEngineStatus('saved', _savedTrack);
    toast(`Engine track set to: ${TRACK_LABELS[_savedTrack] ?? _savedTrack}`);
  } catch (err) {
    btnSaveEngine.disabled = false;
    setEngineStatus('unsaved');
    engineSaveHint.textContent = 'Save failed — ' + err.message;
    engineSaveHint.className   = 'engine-save-hint engine-save-hint--error';
    toast('Save failed: ' + err.message, false);
  }
});

// ── Init engine tab when it first becomes active ──────────────────────────────
// We lazy-load so we don't hit the API until the admin actually opens the tab.
let _engineLoaded = false;

document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.tab === 'engine' && !_engineLoaded) {
      _engineLoaded = true;
      loadEngineTrack();
    }
  });
});
