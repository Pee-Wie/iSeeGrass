import { SEAGRASS_SPECIES, FAMILIES, GENERA, IUCN_STATUSES } from '../species-data.js';

/* ── SVG helpers ── */

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
    <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>`;
}

function iconArrow() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>`;
}

/* ── Populate filter dropdowns from data ── */

function buildSelect(id, options, allLabel) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${allLabel}</option>` +
    options.map(o =>
      typeof o === 'string'
        ? `<option value="${o}">${o}</option>`
        : `<option value="${o.value}">${o.label}</option>`
    ).join('');
}

buildSelect('filter-family', FAMILIES, 'All families');
buildSelect('filter-genus',  GENERA,   'All genera');
buildSelect('filter-status', IUCN_STATUSES, 'All IUCN statuses');

/* ── State ── */

let state = {
  search:      '',
  family:      '',
  genus:       '',
  status:      '',
  region:      'all',    // global region pill filter
  localRegion: 'all',    // local (Philippines) pill filter
  scope:       'global', // 'global' | 'local'
  sort:        'name-az',
};

/* ── Region pill quick-map ── */
const REGION_MAP = {
  caribbean:     s => /caribbean|gulf of mexico/i.test(s.region),
  mediterranean: s => /mediterranean/i.test(s.region),
  'indo-pacific':s => /indo-pacific|southeast asia|red sea|indian ocean|east africa/i.test(s.region),
  temperate:     s => /australia|new zealand|north atlantic|north pacific|europe|japan|korea/i.test(s.region)
                      && !/caribbean|indo-pacific|mediterranean/i.test(s.region),
};

/* ── Local (Philippines) region map ── */
const LOCAL_MAP = {
  luzon:    s => s.phRegions && s.phRegions.includes('luzon'),
  visayas:  s => s.phRegions && s.phRegions.includes('visayas'),
  mindanao: s => s.phRegions && s.phRegions.includes('mindanao'),
};

/* ── Filter + Sort ── */

function getFiltered() {
  let list = SEAGRASS_SPECIES.filter(s => {
    // Scope: local shows only species found in the Philippines
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
    // Dropdowns
    if (state.family && s.family !== state.family) return false;
    if (state.genus  && s.genus  !== state.genus)  return false;
    if (state.status && s.statusColor !== state.status) return false;
    // Search
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
    case 'status':
      const order = { lc: 0, nt: 1, vu: 2, en: 3, cr: 4 };
      list.sort((a, b) => (order[a.statusColor] ?? 5) - (order[b.statusColor] ?? 5));
      break;
  }

  return list;
}

/* ── Card renderer ── */

function renderCard(species) {
  const statusClass = `status-${species.statusColor}`;
  const tagsHtml = species.tags.map(t => `<span class="tag">${t}</span>`).join('');

  return `
    <article
      class="species-card"
      role="listitem"
      tabindex="0"
      data-id="${species.id}"
      aria-label="View details for ${species.commonName}"
    >
      <div class="card-header">
        <div class="card-names">
          <p class="card-common">${species.commonName}</p>
          <p class="card-scientific">${species.scientificName}</p>
        </div>
        <span class="status-badge ${statusClass}">${species.iucnStatus}</span>
      </div>

      <div class="card-meta">
        <span class="meta-chip family-chip">${species.family}</span>
        <span class="meta-chip">${iconGlobe()} ${species.region}</span>
        <span class="meta-chip">${iconDepth()} ${species.depth}</span>
        <span class="meta-chip">${iconLeaf()} ${species.leafLength}</span>
      </div>

      <p class="card-desc">${species.description}</p>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-footer">View details ${iconArrow()}</div>
    </article>
  `;
}

/* ── Modal renderer ── */

function renderModal(species) {
  const statusClass = `status-${species.statusColor}`;
  const facts = [
    { label: 'Family',      value: species.family },
    { label: 'Genus',       value: species.genus },
    { label: 'Habitat',     value: species.habitat },
    { label: 'Depth range', value: species.depth },
    { label: 'Leaf shape',  value: species.leafShape },
    { label: 'Leaf length', value: species.leafLength },
    { label: 'Colour',      value: species.color },
    { label: 'Region',      value: species.region },
    { label: 'IUCN status', value: species.iucnStatus },
  ];

  const factsHtml = facts.map(f => `
    <div class="sg-fact-item">
      <div class="sg-fact-label">${f.label}</div>
      <div class="sg-fact-value">${f.value}</div>
    </div>`).join('');

  const tagsHtml = species.tags.map(t => `<span class="tag">${t}</span>`).join('');

  return `
    <p class="sg-modal-eyebrow">Seagrass Species</p>
    <h2 class="sg-modal-title" id="modal-title-text">${species.commonName}</h2>
    <p class="sg-modal-scientific">${species.scientificName}
      &nbsp;·&nbsp;<span class="status-badge status-${species.statusColor}">${species.iucnStatus}</span>
    </p>

    <hr class="sg-modal-divider">

    <p class="sg-modal-section-title">Description</p>
    <p class="sg-modal-description" id="modal-description-text">${species.description}</p>

    <p class="sg-modal-section-title">Key Facts</p>
    <div class="sg-modal-facts">${factsHtml}</div>

    <hr class="sg-modal-divider">

    <div class="sg-modal-funfact">
      ${iconBulb()}
      <p><strong>Did you know?</strong> ${species.funFact}</p>
    </div>

    <div class="card-tags" style="margin-top:1rem;">${tagsHtml}</div>
  `;
}

/* ── Grid render ── */

function renderGrid() {
  const grid  = document.getElementById('species-grid');
  const count = document.getElementById('results-count');
  const filtered = getFiltered();

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No species match your filters. Try adjusting the search or clearing a filter.</p>
      </div>`;
  } else {
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  count.textContent = `Showing ${filtered.length} of ${SEAGRASS_SPECIES.length} species`;

  grid.querySelectorAll('.species-card').forEach(card => {
    const open = () => openModal(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

/* ── Modal ── */

const overlay  = document.getElementById('species-modal');
const modalBody = document.getElementById('modal-body');
const closeBtn  = document.getElementById('modal-close-btn');
let lastFocused = null;

function openModal(id) {
  const species = SEAGRASS_SPECIES.find(s => s.id === id);
  if (!species) return;
  lastFocused = document.activeElement;
  modalBody.innerHTML = renderModal(species);
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

/* ── Stats bar ── */

function renderStats() {
  const total      = SEAGRASS_SPECIES.length;
  const families   = new Set(SEAGRASS_SPECIES.map(s => s.family)).size;
  const genera     = new Set(SEAGRASS_SPECIES.map(s => s.genus)).size;
  const threatened = SEAGRASS_SPECIES.filter(s => ['vu','en','cr'].includes(s.statusColor)).length;

  const row = document.getElementById('stats-row');
  // Insert chips before the Identify button (which is the last child)
  const identifyBtn = row.querySelector('.btn-identify');
  const chipsHtml = `
    <div class="stat-chip"><strong>${total}</strong> species</div>
    <div class="stat-chip"><strong>${families}</strong> families</div>
    <div class="stat-chip"><strong>${genera}</strong> genera</div>
    <div class="stat-chip"><strong>${threatened}</strong> threatened</div>
  `;
  const temp = document.createElement('div');
  temp.innerHTML = chipsHtml;
  while (temp.firstChild) {
    row.insertBefore(temp.firstChild, identifyBtn);
  }
}

/* ── Event wiring ── */

/* ── Region scope toggle (Global / Local) ── */

document.querySelectorAll('input[name="scope"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isLocal = radio.value === 'local';
    document.getElementById('pills-global').classList.toggle('hidden', isLocal);
    document.getElementById('pills-local').classList.toggle('hidden', !isLocal);

    // Reset both pill sets and state when switching
    document.querySelectorAll('#pills-global .pill').forEach(p => p.classList.remove('active'));
    document.querySelector('#pills-global .pill[data-filter="all"]').classList.add('active');
    document.querySelectorAll('#pills-local .pill').forEach(p => p.classList.remove('active'));
    document.querySelector('#pills-local .pill[data-local-filter="all"]').classList.add('active');

    state.region      = 'all';
    state.localRegion = 'all';
    state.scope       = radio.value;
    renderGrid();
  });
});

// Region pills
document.querySelectorAll('.pill[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pills-global .pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    state.region = btn.dataset.filter;
    renderGrid();
  });
});

// Local (Philippines) pills
document.querySelectorAll('.pill[data-local-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pills-local .pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    state.localRegion = btn.dataset.localFilter;
    renderGrid();
  });
});

// Search
document.getElementById('species-search').addEventListener('input', e => {
  state.search = e.target.value.trim();
  renderGrid();
});

// Dropdowns
document.getElementById('filter-family').addEventListener('change', e => {
  state.family = e.target.value;
  // sync genus dropdown to only genera in that family
  const genusSelect = document.getElementById('filter-genus');
  if (state.family) {
    const validGenera = [...new Set(
      SEAGRASS_SPECIES.filter(s => s.family === state.family).map(s => s.genus)
    )].sort();
    genusSelect.innerHTML = `<option value="">All genera</option>` +
      validGenera.map(g => `<option value="${g}">${g}</option>`).join('');
    state.genus = '';
  } else {
    buildSelect('filter-genus', GENERA, 'All genera');
    state.genus = '';
  }
  renderGrid();
});

document.getElementById('filter-genus').addEventListener('change', e => {
  state.genus = e.target.value;
  renderGrid();
});

document.getElementById('filter-status').addEventListener('change', e => {
  state.status = e.target.value;
  renderGrid();
});

// Sort
document.getElementById('sort-select').addEventListener('change', e => {
  state.sort = e.target.value;
  renderGrid();
});

// Clear all filters button
document.getElementById('clear-filters').addEventListener('click', () => {
  state = { search: '', family: '', genus: '', status: '', region: 'all', localRegion: 'all', scope: 'global', sort: 'name-az' };
  document.getElementById('species-search').value = '';
  document.getElementById('filter-family').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('sort-select').value = 'name-az';
  buildSelect('filter-genus', GENERA, 'All genera');
  // Reset scope to global
  document.querySelector('input[name="scope"][value="global"]').checked = true;
  document.getElementById('pills-global').classList.remove('hidden');
  document.getElementById('pills-local').classList.add('hidden');
  // Reset pills
  document.querySelectorAll('#pills-global .pill').forEach(p => p.classList.remove('active'));
  document.querySelector('#pills-global .pill[data-filter="all"]').classList.add('active');
  document.querySelectorAll('#pills-local .pill').forEach(p => p.classList.remove('active'));
  document.querySelector('#pills-local .pill[data-local-filter="all"]').classList.add('active');
  renderGrid();
});

/* ── Init ── */
renderStats();
renderGrid();
