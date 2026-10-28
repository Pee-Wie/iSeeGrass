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
    if (viewMode === 'tiles') {
      renderTileGrid();
      populateTileDropdowns();
    }
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
  if (e.key === 'Escape') {
    window.closeCatalogModal();
    window.closeDeleteConfirm();
    closeTileModal();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Catalog Tile View
// ══════════════════════════════════════════════════════════════════════════════

let viewMode = 'table';

let tileState = {
  search: '', family: '', genus: '', iucn: '',
  region: 'all', localRegion: 'all', scope: 'global', sort: 'name-az'
};

let tileDropdownsPopulated = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val) || []; } catch { return []; }
}

function iucnClass(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'lc' || s === 'least concern')                                    return 'lc';
  if (s === 'nt' || s === 'near threatened')                                  return 'nt';
  if (s === 'vu' || s.includes('vulnerable'))                                 return 'vu';
  if ((s === 'en' || s.includes('endangered')) && !s.includes('critically'))  return 'en';
  if (s === 'cr' || s.includes('critically'))                                 return 'cr';
  if (s === 'dd' || s.includes('data deficient'))                             return 'dd';
  return 'unknown';
}

const IUCN_SEVERITY = { cr: 0, en: 1, vu: 2, nt: 3, lc: 4, dd: 5, unknown: 6 };

// ── Populate dropdowns ────────────────────────────────────────────────────────

function populateTileDropdowns() {
  const families = [...new Set(catalogEntries.map(e => e.family).filter(Boolean))].sort();
  const genusAll = [...new Set(catalogEntries.map(e => e.genus).filter(Boolean))].sort();
  const iucns    = [...new Set(catalogEntries.map(e => e.iucn_status).filter(Boolean))].sort();

  const famSel = document.getElementById('catFilterFamily');
  if (famSel) {
    famSel.innerHTML = '<option value="">All families</option>' +
      families.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  }

  rebuildGenusDropdown(tileState.family);

  const iucnSel = document.getElementById('catFilterIucn');
  if (iucnSel) {
    iucnSel.innerHTML = '<option value="">All IUCN statuses</option>' +
      iucns.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('');
    if (tileState.iucn) iucnSel.value = tileState.iucn;
  }

  tileDropdownsPopulated = true;
}

function rebuildGenusDropdown(forFamily) {
  const genSel = document.getElementById('catFilterGenus');
  if (!genSel) return;
  const source = forFamily
    ? catalogEntries.filter(e => e.family === forFamily)
    : catalogEntries;
  const genera = [...new Set(source.map(e => e.genus).filter(Boolean))].sort();
  genSel.innerHTML = '<option value="">All genera</option>' +
    genera.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  if (tileState.genus) genSel.value = tileState.genus;
}

// ── Filter + sort ─────────────────────────────────────────────────────────────

function getTileFiltered() {
  let list = catalogEntries.filter(e => {
    // Region scope
    if (tileState.scope === 'local') {
      const ph = parseJsonField(e.ph_regions);
      if (!ph.length) return false;
      if (tileState.localRegion !== 'all') {
        if (!ph.map(r => String(r).toLowerCase()).includes(tileState.localRegion)) return false;
      }
    } else {
      if (tileState.region !== 'all') {
        const reg = String(e.region || '').toLowerCase();
        if (tileState.region === 'caribbean'     && !reg.includes('caribbean'))    return false;
        if (tileState.region === 'mediterranean' && !reg.includes('mediterranean'))return false;
        if (tileState.region === 'indo-pacific'  && !(reg.includes('indo-pacific') || reg.includes('indo pacific'))) return false;
        if (tileState.region === 'temperate'     && !(
          reg.includes('temperate') || reg.includes('southern') ||
          reg.includes('north pacific') || reg.includes('north atlantic') ||
          reg.includes('australia') || reg.includes('new zealand') ||
          reg.includes('japan') || reg.includes('korea') ||
          reg.includes('alaska') || reg.includes('russia') ||
          reg.includes('pacific coast of north america') ||
          reg.includes('europe') || reg.includes('north africa')
        )) return false;
      }
    }

    // Dropdown filters
    if (tileState.family && e.family !== tileState.family) return false;
    if (tileState.genus  && e.genus  !== tileState.genus)  return false;
    if (tileState.iucn && String(e.iucn_status || '').toLowerCase() !== tileState.iucn.toLowerCase()) return false;

    // Text search
    if (tileState.search) {
      const q  = tileState.search.toLowerCase();
      const ph = parseJsonField(e.ph_regions).join(' ');
      const hay = [
        e.common_name, e.scientific_name, e.family, e.genus, e.region, ph
      ].map(v => String(v || '').toLowerCase()).join(' ');
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  list.sort((a, b) => {
    switch (tileState.sort) {
      case 'name-za':
        return String(b.common_name || b.scientific_name || '').localeCompare(String(a.common_name || a.scientific_name || ''));
      case 'scientific':
        return String(a.scientific_name || '').localeCompare(String(b.scientific_name || ''));
      case 'family': {
        const fc = String(a.family || '').localeCompare(String(b.family || ''));
        return fc !== 0 ? fc : String(a.common_name || '').localeCompare(String(b.common_name || ''));
      }
      case 'genus': {
        const gc = String(a.genus || '').localeCompare(String(b.genus || ''));
        return gc !== 0 ? gc : String(a.common_name || '').localeCompare(String(b.common_name || ''));
      }
      case 'iucn': {
        const ai = IUCN_SEVERITY[iucnClass(a.iucn_status)] ?? 6;
        const bi = IUCN_SEVERITY[iucnClass(b.iucn_status)] ?? 6;
        return ai !== bi ? ai - bi : String(a.common_name || '').localeCompare(String(b.common_name || ''));
      }
      default: // name-az
        return String(a.common_name || a.scientific_name || '').localeCompare(String(b.common_name || b.scientific_name || ''));
    }
  });

  return list;
}

// ── Render tile card HTML ─────────────────────────────────────────────────────

function renderTileCard(entry) {
  const cls        = iucnClass(entry.iucn_status);
  const tags       = parseJsonField(entry.tags);
  const ph         = parseJsonField(entry.ph_regions);
  const regionText = ph.length > 0
    ? 'Philippines'
    : String(entry.region || '').slice(0, 40) + (String(entry.region || '').length > 40 ? '…' : '');
  const descRaw   = String(entry.description || '');
  const descShort = descRaw.slice(0, 120) + (descRaw.length > 120 ? '…' : '');

  return `
    <div class="cat-species-card" data-id="${entry.id}" tabindex="0" role="button"
         aria-label="${esc(entry.common_name || entry.scientific_name)}">
      <div class="cat-card-actions">
        <button class="admin-btn admin-btn--icon cat-card-edit" data-id="${entry.id}"
                title="Edit" aria-label="Edit ${esc(entry.common_name || entry.scientific_name)}">
          <i class="ti ti-edit"></i>
        </button>
        <button class="admin-btn admin-btn--icon admin-btn--danger cat-card-del"
                data-id="${entry.id}" data-name="${esc(entry.common_name || entry.scientific_name)}"
                title="Delete" aria-label="Delete ${esc(entry.common_name || entry.scientific_name)}">
          <i class="ti ti-trash"></i>
        </button>
      </div>
      <span class="cat-status-badge cat-status-${cls}">${esc(entry.iucn_status || 'Unknown')}</span>
      <h3 class="cat-card-name">${esc(entry.common_name || entry.scientific_name)}</h3>
      <p class="cat-card-sci">${esc(entry.scientific_name)}</p>
      ${entry.family ? `<span class="cat-card-family">${esc(entry.family)}</span>` : ''}
      ${regionText ? `<div class="cat-card-region"><span class="cat-meta-chip">${esc(regionText)}</span></div>` : ''}
      <div class="cat-card-meta">
        ${entry.depth       ? `<span class="cat-meta-chip">↕ ${esc(entry.depth)}</span>`       : ''}
        ${entry.leaf_length ? `<span class="cat-meta-chip">⌇ ${esc(entry.leaf_length)}</span>` : ''}
      </div>
      ${descShort ? `<p class="cat-card-desc">${esc(descShort)}</p>` : ''}
      ${tags.length > 0 ? `<div class="cat-card-tags">${tags.map(t => `<span class="cat-tag">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="cat-card-footer">View details →</div>
    </div>`;
}

// ── Render tile grid ──────────────────────────────────────────────────────────

function renderTileGrid() {
  const grid    = document.getElementById('catalogTileGrid');
  const countEl = document.getElementById('catTileCount');
  if (!grid) return;

  const filtered = getTileFiltered();

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="cat-empty-state">No species match the current filters.</div>';
  } else {
    grid.innerHTML = filtered.map(e => renderTileCard(e)).join('');

    grid.querySelectorAll('.cat-species-card').forEach(card => {
      card.addEventListener('click', ev => {
        if (ev.target.closest('.cat-card-actions')) return;
        openTileModal(parseInt(card.dataset.id, 10));
      });
      card.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openTileModal(parseInt(card.dataset.id, 10));
        }
      });
    });

    grid.querySelectorAll('.cat-card-edit').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        openEditModal(parseInt(btn.dataset.id, 10));
      });
    });

    grid.querySelectorAll('.cat-card-del').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        window.openDeleteConfirm(parseInt(btn.dataset.id, 10), btn.dataset.name);
      });
    });
  }

  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ${catalogEntries.length} species`;
  }
}

// ── Tile detail modal ─────────────────────────────────────────────────────────

function openTileModal(id) {
  const entry = catalogEntries.find(e => String(e.id) === String(id));
  if (!entry) return;

  const titleEl = document.getElementById('tileModalTitle');
  const bodyEl  = document.getElementById('tileModalBody');
  const editBtn = document.getElementById('tileModalEditBtn');
  const delBtn  = document.getElementById('tileModalDeleteBtn');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = entry.common_name || entry.scientific_name;

  const cls  = iucnClass(entry.iucn_status);
  const tags = parseJsonField(entry.tags);

  const facts = [
    ['Family',       entry.family],
    ['Genus',        entry.genus],
    ['Habitat',      entry.habitat],
    ['Depth range',  entry.depth],
    ['Leaf shape',   entry.leaf_shape],
    ['Leaf length',  entry.leaf_length],
    ['Colour',       entry.color],
    ['Region',       entry.region],
    ['IUCN Status',  entry.iucn_status],
  ].filter(([, v]) => v);

  bodyEl.innerHTML = `
    <p class="sg-modal-scientific"><em>${esc(entry.scientific_name)}</em></p>
    <span class="cat-status-badge cat-status-${cls}">${esc(entry.iucn_status || 'Unknown')}</span>
    <hr class="sg-modal-divider">
    ${entry.description ? `
      <p class="sg-modal-section-title">DESCRIPTION</p>
      <p class="sg-modal-description">${esc(entry.description)}</p>
    ` : ''}
    ${facts.length > 0 ? `
      <p class="sg-modal-section-title">KEY FACTS</p>
      <div class="sg-modal-facts">
        ${facts.map(([label, val]) => `
          <div class="sg-fact-item">
            <span class="sg-fact-label">${esc(label)}</span>
            <span class="sg-fact-value">${esc(val)}</span>
          </div>`).join('')}
      </div>
    ` : ''}
    ${entry.fun_fact ? `
      <hr class="sg-modal-divider">
      <div class="sg-modal-funfact">
        <span>💡</span>
        <p>${esc(entry.fun_fact)}</p>
      </div>
    ` : ''}
    ${tags.length > 0 ? `
      <div class="cat-card-tags" style="margin-top:.75rem;">
        ${tags.map(t => `<span class="cat-tag">${esc(t)}</span>`).join('')}
      </div>
    ` : ''}
  `;

  editBtn.onclick = () => { closeTileModal(); openEditModal(entry.id); };
  delBtn.onclick  = () => { closeTileModal(); window.openDeleteConfirm(entry.id, entry.common_name || entry.scientific_name); };

  const modal = document.getElementById('catalogTileModal');
  modal.removeAttribute('hidden');
  modal.addEventListener('click', ev => { if (ev.target === modal) closeTileModal(); }, { once: true });
}

function closeTileModal() {
  const modal = document.getElementById('catalogTileModal');
  if (modal) modal.setAttribute('hidden', '');
}

window.openTileModal  = openTileModal;
window.closeTileModal = closeTileModal;

// ── View toggle ───────────────────────────────────────────────────────────────

function initViewToggle() {
  const btnTable     = document.getElementById('btnViewTable');
  const btnTiles     = document.getElementById('btnViewTiles');
  const tableWrapper = document.querySelector('#tab-catalog .admin-table-wrapper');
  const tileControls = document.getElementById('catalogTileControls');
  const tileGrid     = document.getElementById('catalogTileGrid');
  if (!btnTable || !btnTiles) return;

  function setView(mode) {
    viewMode = mode;
    if (mode === 'tiles') {
      if (tableWrapper)  tableWrapper.style.display  = 'none';
      if (tileControls)  tileControls.style.display  = '';
      if (tileGrid)      tileGrid.style.display       = '';
      btnTable.classList.remove('active'); btnTable.setAttribute('aria-pressed', 'false');
      btnTiles.classList.add('active');    btnTiles.setAttribute('aria-pressed', 'true');
      if (!tileDropdownsPopulated) populateTileDropdowns();
      renderTileGrid();
    } else {
      if (tableWrapper)  tableWrapper.style.display  = '';
      if (tileControls)  tileControls.style.display  = 'none';
      if (tileGrid)      tileGrid.style.display       = 'none';
      btnTable.classList.add('active');    btnTable.setAttribute('aria-pressed', 'true');
      btnTiles.classList.remove('active'); btnTiles.setAttribute('aria-pressed', 'false');
    }
  }

  btnTable.addEventListener('click', () => setView('table'));
  btnTiles.addEventListener('click', () => setView('tiles'));
}

// ── Tile filter event wiring ──────────────────────────────────────────────────

function initTileFilters() {
  let searchTimer;
  const tileSearchEl = document.getElementById('tileSearch');
  if (tileSearchEl) {
    tileSearchEl.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { tileState.search = tileSearchEl.value; renderTileGrid(); }, 300);
    });
  }

  document.querySelectorAll('input[name="cat-scope"]').forEach(radio => {
    radio.addEventListener('change', () => {
      tileState.scope       = radio.value;
      tileState.region      = 'all';
      tileState.localRegion = 'all';
      const globalPills = document.getElementById('catPillsGlobal');
      const localPills  = document.getElementById('catPillsLocal');
      if (radio.value === 'local') {
        if (globalPills) globalPills.classList.add('hidden');
        if (localPills)  localPills.classList.remove('hidden');
      } else {
        if (globalPills) globalPills.classList.remove('hidden');
        if (localPills)  localPills.classList.add('hidden');
      }
      // reset active pills
      document.querySelectorAll('#catPillsGlobal .cat-pill').forEach(p => p.classList.toggle('active', p.dataset.region === 'all'));
      document.querySelectorAll('#catPillsLocal .cat-pill').forEach(p  => p.classList.toggle('active', p.dataset.local === 'all'));
      renderTileGrid();
    });
  });

  document.querySelectorAll('#catPillsGlobal .cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#catPillsGlobal .cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      tileState.region = pill.dataset.region;
      renderTileGrid();
    });
  });

  document.querySelectorAll('#catPillsLocal .cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#catPillsLocal .cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      tileState.localRegion = pill.dataset.local;
      renderTileGrid();
    });
  });

  const famSel = document.getElementById('catFilterFamily');
  if (famSel) {
    famSel.addEventListener('change', () => {
      tileState.family = famSel.value;
      tileState.genus  = '';
      rebuildGenusDropdown(tileState.family);
      renderTileGrid();
    });
  }

  const genSel = document.getElementById('catFilterGenus');
  if (genSel) {
    genSel.addEventListener('change', () => { tileState.genus = genSel.value; renderTileGrid(); });
  }

  const iucnSel = document.getElementById('catFilterIucn');
  if (iucnSel) {
    iucnSel.addEventListener('change', () => { tileState.iucn = iucnSel.value; renderTileGrid(); });
  }

  const sortSel = document.getElementById('catSort');
  if (sortSel) {
    sortSel.addEventListener('change', () => { tileState.sort = sortSel.value; renderTileGrid(); });
  }

  const clearBtn = document.getElementById('catClearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      tileState = { search: '', family: '', genus: '', iucn: '', region: 'all', localRegion: 'all', scope: 'global', sort: 'name-az' };
      if (tileSearchEl) tileSearchEl.value = '';
      if (sortSel) sortSel.value = 'name-az';
      document.querySelectorAll('#catPillsGlobal .cat-pill').forEach(p => p.classList.toggle('active', p.dataset.region === 'all'));
      document.querySelectorAll('#catPillsLocal .cat-pill').forEach(p  => p.classList.toggle('active', p.dataset.local === 'all'));
      document.querySelectorAll('input[name="cat-scope"]').forEach(r => { r.checked = r.value === 'global'; });
      const globalPills = document.getElementById('catPillsGlobal');
      const localPills  = document.getElementById('catPillsLocal');
      if (globalPills) globalPills.classList.remove('hidden');
      if (localPills)  localPills.classList.add('hidden');
      tileDropdownsPopulated = false;
      populateTileDropdowns();
      renderTileGrid();
    });
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadCatalog();
initViewToggle();
initTileFilters();

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

// ══════════════════════════════════════════════════════════════════════════════
// Platform Statistics Tab — Generate Report
// ══════════════════════════════════════════════════════════════════════════════

(function initReportStats() {
  const btnGenerate = document.getElementById('btnGenerateReport');
  if (!btnGenerate) return;

  // Auto-load on page open with no date filter
  loadReportStats('', '');

  btnGenerate.addEventListener('click', () => {
    const from = document.getElementById('reportDateFrom')?.value ?? '';
    const to   = document.getElementById('reportDateTo')?.value   ?? '';
    loadReportStats(from, to);
  });
})();

async function loadReportStats(dateFrom, dateTo) {
  const btnGenerate = document.getElementById('btnGenerateReport');
  if (btnGenerate) { btnGenerate.disabled = true; btnGenerate.textContent = 'Loading…'; }

  try {
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo)   params.set('date_to',   dateTo);

    const res  = await fetch(`/api/admin/report-stats?${params}`, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message ?? 'Failed to load stats');

    const d = json.data;

    // Stat cards
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
    setEl('rpt-assessments',   d.total_assessments);
    setEl('rpt-identifications', d.total_identifications);
    setEl('rpt-users',         d.active_users);
    setEl('rpt-top-species',   d.top_species ?? '—');

    // Top 3 Species panel
    renderTopSpecies(d.top_species_list ?? []);

    // Flagged Predictions panel
    renderFlaggedList(d.flagged_predictions ?? []);

  } catch (err) {
    toast('Could not load report stats: ' + err.message, false);
  } finally {
    if (btnGenerate) { btnGenerate.disabled = false; btnGenerate.innerHTML = '<i class="ti ti-chart-bar"></i> Generate Report'; }
  }
}

function renderTopSpecies(list) {
  const el = document.getElementById('chartSpecies');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:0.83rem;text-align:center;padding:1.5rem 0;">No identification data in range.</p>';
    return;
  }

  const max = list[0].count || 1;
  const colors = ['#7ccb4d', '#5aaa33', '#3d7a22'];

  el.innerHTML = list.map((item, i) => {
    const pct = Math.round((item.count / max) * 100);
    return `
      <div style="margin-bottom:0.85rem;">
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.25rem;">
          <span style="color:#d6f0b8;font-style:italic;">${esc(item.species)}</span>
          <span style="color:${colors[i]};font-weight:600;">${item.count}</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${colors[i]};border-radius:4px;transition:width 0.5s;"></div>
        </div>
      </div>`;
  }).join('');
}

function renderFlaggedList(list) {
  const el = document.getElementById('flaggedList');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:0.83rem;text-align:center;padding:1.5rem 0;">No pending flagged predictions.</p>';
    return;
  }

  el.innerHTML = list.map(item => {
    const date = item.created_at
      ? new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const user = item.username
      ? `<span style="color:var(--accent);">@${esc(item.username)}</span>`
      : '<span style="color:var(--muted);">Guest</span>';
    const correction = item.user_correction
      ? `→ <em style="color:#d6f0b8;">${esc(item.user_correction)}</em>`
      : '';
    const conf = item.model_confidence != null
      ? ` (${parseFloat(item.model_confidence).toFixed(1)}%)`
      : '';

    return `
      <div style="padding:0.65rem 0;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">
          <div>
            <div style="font-size:0.83rem;color:var(--text);font-weight:500;">
              <i class="ti ti-flag" style="color:#e07070;margin-right:0.3em;font-size:0.85rem;"></i>
              ${esc(item.model_prediction)}${conf} ${correction}
            </div>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:0.15rem;">
              ${user} &nbsp;·&nbsp; ${date}
              ${item.notes ? ` &nbsp;·&nbsp; <em>${esc(item.notes.slice(0, 60))}${item.notes.length > 60 ? '…' : ''}</em>` : ''}
            </div>
          </div>
          <span style="font-size:0.7rem;padding:0.15rem 0.5rem;background:rgba(224,176,96,0.15);border:1px solid rgba(224,176,96,0.3);border-radius:4px;color:#e0b060;white-space:nowrap;">pending</span>
        </div>
      </div>`;
  }).join('');
}
