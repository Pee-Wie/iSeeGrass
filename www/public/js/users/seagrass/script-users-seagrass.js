/**
 * iSeeGrass — User Seagrass Catalog page script
 * Standalone module; uses cat- prefixed DOM ids/classes so it
 * never conflicts with the public guest explore page.
 */

import { SEAGRASS_SPECIES, FAMILIES, GENERA, IUCN_STATUSES } from '../../species-data.js';

/* ═══════════════════════════════════════════════════════════════════
   SVG icon helpers
   ═══════════════════════════════════════════════════════════════════ */

function iconGlobe() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`;
}

function iconDepth() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <polyline points="17 11 12 6 7 11"/>
    <polyline points="17 18 12 13 7 18"/>
  </svg>`;
}

function iconLeaf() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>`;
}

function iconBulb() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <line x1="9" y1="18" x2="15" y2="18"/>
    <line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>`;
}

function iconArrow() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════════════
   Filter dropdown helpers
   ═══════════════════════════════════════════════════════════════════ */

function buildSelect(id, options, allLabel) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML =
    `<option value="">${allLabel}</option>` +
    options
      .map(o =>
        typeof o === 'string'
          ? `<option value="${o}">${o}</option>`
          : `<option value="${o.value}">${o.label}</option>`
      )
      .join('');
}

buildSelect('cat-filter-family', FAMILIES,     'All families');
buildSelect('cat-filter-genus',  GENERA,        'All genera');
buildSelect('cat-filter-status', IUCN_STATUSES, 'All IUCN statuses');

/* ═══════════════════════════════════════════════════════════════════
   Filter state
   ═══════════════════════════════════════════════════════════════════ */

let state = {
  search:      '',
  family:      '',
  genus:       '',
  status:      '',
  region:      'all',    // global region pill
  localRegion: 'all',    // local (Philippines) pill
  scope:       'global', // 'global' | 'local'
  sort:        'name-az',
};

/* ── Region maps ── */

const REGION_MAP = {
  caribbean:      s => /caribbean|gulf of mexico/i.test(s.region),
  mediterranean:  s => /mediterranean/i.test(s.region),
  'indo-pacific': s => /indo-pacific|southeast asia|red sea|indian ocean|east africa/i.test(s.region),
  temperate:      s =>
    /australia|new zealand|north atlantic|north pacific|europe|japan|korea/i.test(s.region) &&
    !/caribbean|indo-pacific|mediterranean/i.test(s.region),
};

const LOCAL_MAP = {
  luzon:    s => s.phRegions && s.phRegions.includes('luzon'),
  visayas:  s => s.phRegions && s.phRegions.includes('visayas'),
  mindanao: s => s.phRegions && s.phRegions.includes('mindanao'),
};

/* ═══════════════════════════════════════════════════════════════════
   Filter + Sort
   ═══════════════════════════════════════════════════════════════════ */

function getFiltered() {
  let list = SEAGRASS_SPECIES.filter(s => {
    // Scope: local — only Philippines species
    if (state.scope === 'local') {
      if (!s.phRegions || s.phRegions.length === 0) return false;
      if (state.localRegion !== 'all') {
        const fn = LOCAL_MAP[state.localRegion];
        if (fn && !fn(s)) return false;
      }
    } else {
      // Global region pill
      if (state.region !== 'all') {
        const fn = REGION_MAP[state.region];
        if (fn && !fn(s)) return false;
      }
    }

    if (state.family && s.family !== state.family) return false;
    if (state.genus  && s.genus  !== state.genus)  return false;
    if (state.status && s.statusColor !== state.status) return false;

    if (state.search) {
      const q = state.search.toLowerCase();
      const hit =
        s.commonName.toLowerCase().includes(q)     ||
        s.scientificName.toLowerCase().includes(q) ||
        s.genus.toLowerCase().includes(q)          ||
        s.family.toLowerCase().includes(q)         ||
        s.region.toLowerCase().includes(q)         ||
        s.habitat.toLowerCase().includes(q)        ||
        s.tags.some(t => t.toLowerCase().includes(q));
      if (!hit) return false;
    }

    return true;
  });

  // Sort
  switch (state.sort) {
    case 'name-az':
      list.sort((a, b) => a.commonName.localeCompare(b.commonName));
      break;
    case 'name-za':
      list.sort((a, b) => b.commonName.localeCompare(a.commonName));
      break;
    case 'scientific':
      list.sort((a, b) => a.scientificName.localeCompare(b.scientificName));
      break;
    case 'family':
      list.sort((a, b) => a.family.localeCompare(b.family) || a.commonName.localeCompare(b.commonName));
      break;
    case 'genus':
      list.sort((a, b) => a.genus.localeCompare(b.genus) || a.commonName.localeCompare(b.commonName));
      break;
    case 'status': {
      const order = { lc: 0, nt: 1, vu: 2, en: 3, cr: 4 };
      list.sort((a, b) => (order[a.statusColor] ?? 5) - (order[b.statusColor] ?? 5));
      break;
    }
  }

  return list;
}

/* ═══════════════════════════════════════════════════════════════════
   Card renderer
   ═══════════════════════════════════════════════════════════════════ */

function renderCard(s) {
  const tagsHtml = s.tags.map(t => `<span class="cat-tag">${t}</span>`).join('');

  return `
    <article
      class="cat-species-card"
      role="listitem"
      tabindex="0"
      data-id="${s.id}"
      aria-label="View details for ${s.commonName}"
    >
      <div class="cat-card-header">
        <div class="cat-card-names">
          <p class="cat-card-common">${s.commonName}</p>
          <p class="cat-card-scientific">${s.scientificName}</p>
        </div>
        <span class="cat-status-badge cat-status-${s.statusColor}">${s.iucnStatus}</span>
      </div>

      <div class="cat-card-meta">
        <span class="cat-meta-chip cat-family-chip">${s.family}</span>
        <span class="cat-meta-chip">${iconGlobe()} ${s.region}</span>
        <span class="cat-meta-chip">${iconDepth()} ${s.depth}</span>
        <span class="cat-meta-chip">${iconLeaf()} ${s.leafLength}</span>
      </div>

      <p class="cat-card-desc">${s.description}</p>
      <div class="cat-card-tags">${tagsHtml}</div>
      <div class="cat-card-footer">View details ${iconArrow()}</div>
    </article>`;
}

/* ═══════════════════════════════════════════════════════════════════
   Modal renderer
   ═══════════════════════════════════════════════════════════════════ */

function renderModal(s) {
  const facts = [
    { label: 'Family',      value: s.family     },
    { label: 'Genus',       value: s.genus      },
    { label: 'Habitat',     value: s.habitat    },
    { label: 'Depth range', value: s.depth      },
    { label: 'Leaf shape',  value: s.leafShape  },
    { label: 'Leaf length', value: s.leafLength },
    { label: 'Colour',      value: s.color      },
    { label: 'Region',      value: s.region     },
    { label: 'IUCN status', value: s.iucnStatus },
  ]
    .map(
      f => `
      <div class="cat-fact-item">
        <div class="cat-fact-label">${f.label}</div>
        <div class="cat-fact-value">${f.value}</div>
      </div>`
    )
    .join('');

  const tagsHtml = s.tags.map(t => `<span class="cat-tag">${t}</span>`).join('');

  return `
    <p class="cat-modal-eyebrow">Seagrass Species</p>
    <h2 class="cat-modal-title" id="cat-modal-title-text">${s.commonName}</h2>
    <p class="cat-modal-scientific">
      <em>${s.scientificName}</em>
      &nbsp;·&nbsp;
      <span class="cat-status-badge cat-status-${s.statusColor}">${s.iucnStatus}</span>
    </p>

    <hr class="cat-modal-divider">

    <p class="cat-modal-section-title">Description</p>
    <p class="cat-modal-description" id="cat-modal-desc-text">${s.description}</p>

    <p class="cat-modal-section-title">Key Facts</p>
    <div class="cat-modal-facts">${facts}</div>

    <hr class="cat-modal-divider">

    <div class="cat-modal-funfact">
      ${iconBulb()}
      <p><strong>Did you know?</strong> ${s.funFact}</p>
    </div>

    <div class="cat-card-tags" style="margin-top:1rem;">${tagsHtml}</div>`;
}

/* ═══════════════════════════════════════════════════════════════════
   Grid render
   ═══════════════════════════════════════════════════════════════════ */

function renderGrid() {
  const grid     = document.getElementById('cat-species-grid');
  const count    = document.getElementById('cat-results-count');
  const filtered = getFiltered();

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="cat-empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No species match your filters. Try adjusting the search or clearing a filter.</p>
      </div>`;
  } else {
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  count.textContent = `Showing ${filtered.length} of ${SEAGRASS_SPECIES.length} species`;

  grid.querySelectorAll('.cat-species-card').forEach(card => {
    const open = () => openModal(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Modal open / close
   ═══════════════════════════════════════════════════════════════════ */

const overlay   = document.getElementById('cat-species-modal');
const modalBody = document.getElementById('cat-modal-body');
const closeBtn  = document.getElementById('cat-modal-close-btn');
let   lastFocused = null;

function openModal(id) {
  const s = SEAGRASS_SPECIES.find(x => x.id === id);
  if (!s) return;
  lastFocused           = document.activeElement;
  modalBody.innerHTML   = renderModal(s);
  overlay.classList.add('open');
  closeBtn.focus();
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}

closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
});

/* ═══════════════════════════════════════════════════════════════════
   Stats chips
   ═══════════════════════════════════════════════════════════════════ */

function renderStats() {
  const total      = SEAGRASS_SPECIES.length;
  const families   = new Set(SEAGRASS_SPECIES.map(s => s.family)).size;
  const genera     = new Set(SEAGRASS_SPECIES.map(s => s.genus)).size;
  const threatened = SEAGRASS_SPECIES.filter(s => ['vu', 'en', 'cr'].includes(s.statusColor)).length;

  const row = document.getElementById('catalog-stats-row');
  const btn = row.querySelector('.catalog-identify-btn');

  const chips = `
    <div class="cat-stat-chip"><strong>${total}</strong> species</div>
    <div class="cat-stat-chip"><strong>${families}</strong> families</div>
    <div class="cat-stat-chip"><strong>${genera}</strong> genera</div>
    <div class="cat-stat-chip"><strong>${threatened}</strong> threatened</div>`;

  const tmp = document.createElement('div');
  tmp.innerHTML = chips;
  while (tmp.firstChild) row.insertBefore(tmp.firstChild, btn);
}

/* ═══════════════════════════════════════════════════════════════════
   Event wiring
   ═══════════════════════════════════════════════════════════════════ */

// Scope toggle (Global / Local)
document.querySelectorAll('input[name="cat-scope"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isLocal = radio.value === 'local';
    document.getElementById('cat-pills-global').classList.toggle('cat-hidden', isLocal);
    document.getElementById('cat-pills-local').classList.toggle('cat-hidden', !isLocal);

    // Reset pills on switch
    document.querySelectorAll('#cat-pills-global .cat-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('#cat-pills-global .cat-pill[data-filter="all"]').classList.add('active');
    document.querySelectorAll('#cat-pills-local .cat-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('#cat-pills-local .cat-pill[data-local-filter="all"]').classList.add('active');

    state.region      = 'all';
    state.localRegion = 'all';
    state.scope       = radio.value;
    renderGrid();
  });
});

// Global region pills
document.querySelectorAll('#cat-pills-global .cat-pill[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#cat-pills-global .cat-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    state.region = btn.dataset.filter;
    renderGrid();
  });
});

// Local (Philippines) pills
document.querySelectorAll('#cat-pills-local .cat-pill[data-local-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#cat-pills-local .cat-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    state.localRegion = btn.dataset.localFilter;
    renderGrid();
  });
});

// Search
document.getElementById('cat-species-search').addEventListener('input', e => {
  state.search = e.target.value.trim();
  renderGrid();
});

// Family dropdown — also sync genus
document.getElementById('cat-filter-family').addEventListener('change', e => {
  state.family = e.target.value;
  const genusSelect = document.getElementById('cat-filter-genus');
  if (state.family) {
    const validGenera = [
      ...new Set(SEAGRASS_SPECIES.filter(s => s.family === state.family).map(s => s.genus)),
    ].sort();
    genusSelect.innerHTML =
      `<option value="">All genera</option>` +
      validGenera.map(g => `<option value="${g}">${g}</option>`).join('');
    state.genus = '';
  } else {
    buildSelect('cat-filter-genus', GENERA, 'All genera');
    state.genus = '';
  }
  renderGrid();
});

document.getElementById('cat-filter-genus').addEventListener('change', e => {
  state.genus = e.target.value;
  renderGrid();
});

document.getElementById('cat-filter-status').addEventListener('change', e => {
  state.status = e.target.value;
  renderGrid();
});

document.getElementById('cat-sort-select').addEventListener('change', e => {
  state.sort = e.target.value;
  renderGrid();
});

// Clear all
document.getElementById('cat-clear-filters').addEventListener('click', () => {
  state = { search: '', family: '', genus: '', status: '', region: 'all', localRegion: 'all', scope: 'global', sort: 'name-az' };
  document.getElementById('cat-species-search').value = '';
  document.getElementById('cat-filter-family').value  = '';
  document.getElementById('cat-filter-status').value  = '';
  document.getElementById('cat-sort-select').value    = 'name-az';
  buildSelect('cat-filter-genus', GENERA, 'All genera');

  document.querySelector('input[name="cat-scope"][value="global"]').checked = true;
  document.getElementById('cat-pills-global').classList.remove('cat-hidden');
  document.getElementById('cat-pills-local').classList.add('cat-hidden');

  document.querySelectorAll('#cat-pills-global .cat-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('#cat-pills-global .cat-pill[data-filter="all"]').classList.add('active');
  document.querySelectorAll('#cat-pills-local .cat-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('#cat-pills-local .cat-pill[data-local-filter="all"]').classList.add('active');

  renderGrid();
});

/* ═══════════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════════ */

renderStats();
renderGrid();
