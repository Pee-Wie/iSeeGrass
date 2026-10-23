/**
 * Admin — Assessments page
 * Handles: list with filters + pagination, view full content in modal.
 */
'use strict';

import { listAssessments, getAssessment, deleteAssessment } from '../../api/assessments.api.js';
import { listUsers } from '../../api/users.api.js';

let currentPage = 1;
const LIMIT = 20;

const tbody         = document.getElementById('assessmentsTableBody');
const pageIndicator = document.getElementById('pageIndicator');
const btnPrev       = document.getElementById('btnPrevPage');
const btnNext       = document.getElementById('btnNextPage');
const filterUser    = document.getElementById('filterUser');
const filterStatus  = document.getElementById('filterStatus');
const filterFrom    = document.getElementById('filterDateFrom');
const filterTo      = document.getElementById('filterDateTo');
const btnReset      = document.getElementById('btnResetFilters');

// Status badge map
const STATUS = {
  draft:       '<span class="badge badge-muted">Draft</span>',
  in_progress: '<span class="badge badge-yellow">In Progress</span>',
  finalized:   '<span class="badge badge-green">Finalized</span>',
};

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toast(msg, ok = true) {
  let el = document.getElementById('adminToast');
  if (!el) { el = document.createElement('div'); el.id = 'adminToast'; el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:.75rem 1.25rem;border-radius:8px;font-size:.9rem;color:#fff;'; document.body.appendChild(el); }
  el.textContent = msg; el.style.background = ok ? '#4a8c2b' : '#b00'; el.style.opacity = '1';
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

// ── Populate user filter dropdown ─────────────────────────────────────────────
async function populateUserFilter() {
  try {
    const data = await listUsers({ limit: 200 });
    (data.users || []).forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.first_name} ${u.last_name}`;
      filterUser.appendChild(opt);
    });
  } catch { /* non-critical */ }
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable(rows) {
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;padding:2rem">No assessments found.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((a, i) => {
    const user = a.first_name ? `${a.first_name} ${a.last_name}` : `User #${a.user_id}`;
    const date = a.created_at ? a.created_at.split(' ')[0] : '—';
    return `<tr data-id="${a.id}">
      <td>${(currentPage - 1) * LIMIT + i + 1}</td>
      <td>${esc(a.title)}</td>
      <td>${esc(user)}</td>
      <td>—</td>
      <td>${STATUS[a.status] || esc(a.status)}</td>
      <td>${date}</td>
      <td>
        <div class="action-btn-group">
          <button class="admin-btn admin-btn--icon btn-view" data-id="${a.id}" title="View"><i class="ti ti-eye"></i></button>
          <button class="admin-btn admin-btn--icon admin-btn--danger btn-delete" data-id="${a.id}" data-title="${esc(a.title)}" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-view').forEach(btn => btn.addEventListener('click', () => openDetail(btn.dataset.id)));
  tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => doDelete(btn.dataset.id, btn.dataset.title)));
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadAssessments(page = 1) {
  currentPage = page;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;padding:2rem">Loading…</td></tr>';
  try {
    const data = await listAssessments({
      page, limit: LIMIT,
      user_id:   filterUser.value   || '',
      status:    filterStatus.value || '',
      date_from: filterFrom.value   || '',
      date_to:   filterTo.value     || '',
    });
    renderTable(data.assessments || []);
    const totalPages = Math.max(1, Math.ceil((data.total || 0) / LIMIT));
    pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    btnPrev.disabled = page <= 1;
    btnNext.disabled = page >= totalPages;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#b00;text-align:center;padding:2rem">${esc(err.message)}</td></tr>`;
  }
}

// ── Detail modal ──────────────────────────────────────────────────────────────
async function openDetail(id) {
  const modal = document.getElementById('assessmentDetailModal');
  document.getElementById('modalAssessmentTitle').textContent = 'Loading…';
  document.getElementById('modalUser').textContent   = '—';
  document.getElementById('modalDate').textContent   = '—';
  document.getElementById('modalStatus').textContent = '—';
  document.getElementById('modalSpecies').textContent= '—';
  document.getElementById('modalContent').innerHTML  = '';
  modal.hidden = false;

  try {
    const a = await getAssessment(id);
    document.getElementById('modalAssessmentTitle').textContent = a.title;
    document.getElementById('modalUser').textContent   = a.first_name ? `${a.first_name} ${a.last_name}` : `User #${a.user_id}`;
    document.getElementById('modalDate').textContent   = a.created_at ? a.created_at.split(' ')[0] : '—';
    document.getElementById('modalStatus').textContent = a.status;
    document.getElementById('modalContent').innerHTML  = a.content || '<em style="color:#888">No content.</em>';
  } catch (err) {
    document.getElementById('modalContent').textContent = err.message;
  }
}

window.closeAssessmentModal = () => { document.getElementById('assessmentDetailModal').hidden = true; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeAssessmentModal(); });

// ── Delete ────────────────────────────────────────────────────────────────────
async function doDelete(id, title) {
  if (!confirm(`Delete assessment "${title}"? This cannot be undone.`)) return;
  try {
    await deleteAssessment(id);
    toast('Assessment deleted.');
    loadAssessments(currentPage);
  } catch (err) { toast(err.message, false); }
}

// ── Filters / pagination ──────────────────────────────────────────────────────
filterUser.addEventListener('change',   () => loadAssessments(1));
filterStatus.addEventListener('change', () => loadAssessments(1));
filterFrom.addEventListener('change',   () => loadAssessments(1));
filterTo.addEventListener('change',     () => loadAssessments(1));
btnReset.addEventListener('click', () => {
  filterUser.value = ''; filterStatus.value = ''; filterFrom.value = ''; filterTo.value = '';
  loadAssessments(1);
});
btnPrev.addEventListener('click', () => loadAssessments(currentPage - 1));
btnNext.addEventListener('click', () => loadAssessments(currentPage + 1));

// ── Init ──────────────────────────────────────────────────────────────────────
populateUserFilter();
loadAssessments(1);
