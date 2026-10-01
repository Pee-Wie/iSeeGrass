/**
 * iSeeGrass — Users Dashboard
 * views/users/dashboard.html
 *
 * Handles:
 *  - Stat counters (identifications, observations, unique species)
 *  - Recent Activity list
 *  - Species Breakdown bar chart
 *  - Negros Region species reference grid
 *
 * Data source: localStorage (temporary until PHP backend API is wired up).
 * To connect the backend, replace getObservations() and the identCount read
 * with fetch() calls to the appropriate API endpoints.
 */

import { SEAGRASS_SPECIES } from '../../../species-data.js';

/* ─────────────────────────────────────────────────────────────
   Negros region scope:
   Species recorded in the Visayas phRegion are the ones
   documented from Negros waters — the CNN model's trained scope.
───────────────────────────────────────────────────────────── */
const NEGROS_SPECIES = SEAGRASS_SPECIES.filter(s =>
    s.phRegions && s.phRegions.includes('visayas')
);

/* ─────────────────────────────────────────────────────────────
   Data helpers
   TODO: replace both functions with API calls once the PHP
   backend endpoints exist, e.g.:
     const res  = await fetch('/api/observations');
     const data = await res.json();
───────────────────────────────────────────────────────────── */
function getObservations() {
    try {
        return JSON.parse(localStorage.getItem('iseeGrassObservations') || '[]');
    } catch {
        return [];
    }
}

function getIdentCount() {
    return parseInt(localStorage.getItem('iseeGrassIdentCount') || '0', 10);
}

/* ─────────────────────────────────────────────────────────────
   Stat counters
───────────────────────────────────────────────────────────── */
function renderStats(observations) {
    const identCount    = getIdentCount();
    const uniqueSpecies = [...new Set(observations.map(o => o.speciesId).filter(Boolean))];

    document.getElementById('stat-identifications').textContent = identCount;
    document.getElementById('stat-observations').textContent    = observations.length;
    document.getElementById('stat-species').textContent         = uniqueSpecies.length;
}

/* ─────────────────────────────────────────────────────────────
   Recent Activity
───────────────────────────────────────────────────────────── */
function renderActivity(observations) {
    const list = document.getElementById('activity-list');
    if (!list) return;

    if (observations.length === 0) {
        list.innerHTML = `
            <li>
                <div class="empty-state-dash">
                    <div class="es-icon"><i class="ti ti-plant"></i></div>
                    <p>No observations yet.<br>
                    <a href="/views/users/identify.html" style="color:#9fe997;">Run your first identification</a>
                    to start building your record.</p>
                </div>
            </li>`;
        return;
    }

    const recent = [...observations]
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 6);

    list.innerHTML = recent.map(obs => {
        const speciesMatch = SEAGRASS_SPECIES.find(s => s.id === obs.speciesId);
        const name = speciesMatch
            ? speciesMatch.commonName
            : (obs.speciesName || 'Unknown species');

        const date = obs.date
            ? new Date(obs.date).toLocaleDateString('en-PH', {
                month: 'short', day: 'numeric', year: 'numeric'
              })
            : 'Unknown date';

        const conf = obs.confidence
            ? `${Math.round(obs.confidence * 100)}% confidence`
            : '';

        const loc  = obs.location || '';
        const meta = [date, loc, conf].filter(Boolean).join(' · ');

        return `
            <li class="activity-item">
                <div class="act-icon"><i class="ti ti-microscope"></i></div>
                <div class="act-body">
                    <div class="act-title">${name}</div>
                    <div class="act-meta">${meta}</div>
                </div>
                ${conf ? `<span class="act-badge">${conf}</span>` : ''}
            </li>`;
    }).join('');
}

/* ─────────────────────────────────────────────────────────────
   Species Breakdown bar chart
───────────────────────────────────────────────────────────── */
function renderBreakdown(observations) {
    const container = document.getElementById('species-breakdown');
    if (!container) return;

    const uniqueIds = [...new Set(observations.map(o => o.speciesId).filter(Boolean))];

    if (observations.length === 0 || uniqueIds.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dash">
                <div class="es-icon"><i class="ti ti-chart-bar"></i></div>
                <p>Species breakdown will appear here once you have saved observations.</p>
            </div>`;
        return;
    }

    const counts = {};
    observations.forEach(o => {
        if (o.speciesId) counts[o.speciesId] = (counts[o.speciesId] || 0) + 1;
    });

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const max = sorted[0][1];

    container.innerHTML = sorted.map(([id, count]) => {
        const sp   = SEAGRASS_SPECIES.find(s => s.id === id);
        const name = sp ? sp.commonName : id;
        const pct  = Math.round((count / max) * 100);

        return `
            <div class="species-bar-item">
                <div class="bar-label">
                    <span class="bar-name">${name}</span>
                    <span class="bar-count">${count} obs.</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${pct}%"></div>
                </div>
            </div>`;
    }).join('');
}

/* ─────────────────────────────────────────────────────────────
   Negros Species Reference Grid
───────────────────────────────────────────────────────────── */
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
        </div>`
    ).join('');
}

/* ─────────────────────────────────────────────────────────────
   Init — runs on DOMContentLoaded
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const observations = getObservations();
    renderStats(observations);
    renderActivity(observations);
    renderBreakdown(observations);
    renderNegrosGrid();
});
