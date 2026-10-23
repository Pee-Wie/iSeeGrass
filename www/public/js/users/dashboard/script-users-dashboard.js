/**
 * iSeeGrass — Users Dashboard
 * Pulls real data from the PHP API; falls back to empty state.
 */
'use strict';

import { get } from '../../api/client.js';
import { SEAGRASS_SPECIES } from '../../../species-data.js';

const NEGROS_SPECIES = SEAGRASS_SPECIES.filter(s => s.phRegions?.includes('visayas'));

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await get('/dashboard/stats');
    document.getElementById('stat-identifications').textContent = data.identifications ?? '0';
    document.getElementById('stat-observations').textContent    = data.assessments     ?? '0';
    document.getElementById('stat-species').textContent         = data.species         ?? '0';
    renderActivity(data.recent_activity || []);
  } catch {
    // leave '—' placeholders in place
  }
}

// ── Recent activity ───────────────────────────────────────────────────────────
function renderActivity(activities) {
  const list = document.getElementById('activity-list');
  if (!list) return;

  if (!activities.length) {
    list.innerHTML = `<li><div class="empty-state-dash">
      <div class="es-icon"><i class="ti ti-plant"></i></div>
      <p>No activity yet.<br>
      <a href="/views/users/identify.html" style="color:#9fe997;">Run your first identification</a>
      to start building your record.</p>
    </div></li>`;
    return;
  }

  list.innerHTML = activities.map(item => {
    const name = item.top_result || 'Unknown species';
    const conf = item.top_confidence ? `${parseFloat(item.top_confidence).toFixed(1)}% confidence` : '';
    const date = item.created_at
      ? new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    const meta = [date, conf].filter(Boolean).join(' · ');
    return `<li class="activity-item">
      <div class="act-icon"><i class="ti ti-microscope"></i></div>
      <div class="act-body">
        <div class="act-title">${name}</div>
        <div class="act-meta">${meta}</div>
      </div>
      ${conf ? `<span class="act-badge">${conf}</span>` : ''}
    </li>`;
  }).join('');
}

// ── Negros species grid ───────────────────────────────────────────────────────
function renderNegrosGrid() {
  const grid = document.getElementById('negros-species-grid');
  if (!grid) return;
  grid.innerHTML = NEGROS_SPECIES.map(sp => `
    <div class="col-sm-6 col-lg-4">
      <div class="negros-species-card">
        <p class="nsc-name">${sp.commonName}</p>
        <p class="nsc-scientific">${sp.scientificName}</p>
        <p class="nsc-habitat">${sp.habitat}</p>
      </div>
    </div>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  renderNegrosGrid();
});
