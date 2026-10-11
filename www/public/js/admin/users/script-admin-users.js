/**
 * Admin — Users page
 * Handles: list with filters + pagination, create account modal, edit status, delete.
 */
'use strict';

import { listUsers, createUser, updateUser, deleteUser } from '../../api/users.api.js';

// ── State ─────────────────────────────────────────────────────────────────────
let currentPage = 1;
const LIMIT     = 25;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const tbody        = document.getElementById('usersTableBody');
const pageIndicator= document.getElementById('pageIndicator');
const btnPrev      = document.getElementById('btnPrevPage');
const btnNext      = document.getElementById('btnNextPage');
const filterSearch = document.getElementById('filterSearch');
const filterRole   = document.getElementById('filterRole');
const filterStatus = document.getElementById('filterStatus');
const btnReset     = document.getElementById('btnResetFilters');

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, ok = true) {
  let el = document.getElementById('adminToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'adminToast';
    el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:.75rem 1.25rem;border-radius:8px;font-size:.9rem;font-weight:500;color:#fff;transition:opacity .3s;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = ok ? '#4a8c2b' : '#b00';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

// ── Table render ──────────────────────────────────────────────────────────────
function renderTable(users) {
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;padding:2rem">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map((u, i) => {
    const name     = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—';
    const initials = ((u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')).toUpperCase() || '?';
    const avatarCell = u.avatar_url
      ? `<img src="${esc(u.avatar_url)}" alt="${esc(name)}"
              style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.12);"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <span style="display:none;width:34px;height:34px;border-radius:50%;background:var(--accent,#7ccb4d);color:#1a2e0a;font-size:.78rem;font-weight:700;align-items:center;justify-content:center;flex-shrink:0;">${esc(initials)}</span>`
      : `<span style="display:flex;width:34px;height:34px;border-radius:50%;background:var(--accent,#7ccb4d);color:#1a2e0a;font-size:.78rem;font-weight:700;align-items:center;justify-content:center;flex-shrink:0;">${esc(initials)}</span>`;
    const posBadge = positionBadge(u.position);
    const stBadge  = u.status === 'active'
      ? '<span class="badge badge-green">Active</span>'
      : '<span class="badge badge-muted">Inactive</span>';
    const joined   = u.created_at ? u.created_at.split(' ')[0] : '—';
    const toggleTitle = u.status === 'active' ? 'Deactivate' : 'Activate';
    const toggleIcon  = u.status === 'active' ? 'ti-user-off' : 'ti-user-check';

    return `<tr data-id="${u.id}" data-status="${u.status}">
      <td>${(currentPage - 1) * LIMIT + i + 1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:.65rem;">
          ${avatarCell}
          <span>${esc(name)}</span>
        </div>
      </td>
      <td>${esc(u.email)}</td>
      <td>${posBadge}</td>
      <td>${stBadge}</td>
      <td>${joined}</td>
      <td>
        <div class="action-btn-group">
          <button class="admin-btn admin-btn--icon btn-toggle-status" title="${toggleTitle}" data-id="${u.id}" data-status="${u.status}">
            <i class="ti ${toggleIcon}"></i>
          </button>
          <button class="admin-btn admin-btn--icon admin-btn--danger btn-delete" title="Delete" data-id="${u.id}" data-name="${esc(name)}">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Wire action buttons
  tbody.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', () => toggleStatus(btn.dataset.id, btn.dataset.status));
  });
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id, btn.dataset.name));
  });
}

function positionBadge(pos) {
  const map = {
    'Researcher':      'badge-green',
    'Class Instructor':'badge-yellow',
    'Student':         'badge-blue',
    'Other':           'badge-muted',
  };
  return `<span class="badge ${map[pos] || 'badge-muted'}">${esc(pos || '—')}</span>`;
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Load users ────────────────────────────────────────────────────────────────
async function loadUsers(page = 1) {
  currentPage = page;
  const params = {
    page,
    limit:    LIMIT,
    search:   filterSearch.value.trim(),
    position: filterRole.value,
    status:   filterStatus.value,
  };

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;padding:2rem">Loading…</td></tr>';

  try {
    const data = await listUsers(params);
    renderTable(data.users || []);

    const totalPages = Math.max(1, Math.ceil((data.total || 0) / LIMIT));
    pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    btnPrev.disabled = page <= 1;
    btnNext.disabled = page >= totalPages;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#b00;padding:2rem">${esc(err.message)}</td></tr>`;
  }
}

// ── Filters ───────────────────────────────────────────────────────────────────
let filterTimer;
filterSearch.addEventListener('input', () => { clearTimeout(filterTimer); filterTimer = setTimeout(() => loadUsers(1), 350); });
filterRole.addEventListener('change',   () => loadUsers(1));
filterStatus.addEventListener('change', () => loadUsers(1));
btnReset.addEventListener('click', () => {
  filterSearch.value = '';
  filterRole.value   = '';
  filterStatus.value = '';
  loadUsers(1);
});

btnPrev.addEventListener('click', () => loadUsers(currentPage - 1));
btnNext.addEventListener('click', () => loadUsers(currentPage + 1));

// ── Toggle status ─────────────────────────────────────────────────────────────
async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  try {
    await updateUser(id, { status: newStatus });
    toast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
    loadUsers(currentPage);
  } catch (err) {
    toast(err.message, false);
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(id, name) {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
  doDelete(id);
}

async function doDelete(id) {
  try {
    await deleteUser(id);
    toast('User deleted.');
    loadUsers(currentPage);
  } catch (err) {
    toast(err.message, false);
  }
}

// ── Create Account Modal ──────────────────────────────────────────────────────
const modal    = document.getElementById('createAccountModal');
const backdrop = document.getElementById('createAccountBackdrop');
const form     = document.getElementById('createAccountForm');

function openModal() {
  form.reset();
  clearErrors();
  modal.hidden    = false;
  backdrop.hidden = false;
  document.getElementById('caFirstName').focus();
}

function closeModal() {
  modal.hidden    = true;
  backdrop.hidden = true;
}

document.getElementById('btnCreateAccount').addEventListener('click', openModal);
document.getElementById('btnCloseCreateModal').addEventListener('click', closeModal);
document.getElementById('btnCancelCreate').addEventListener('click', closeModal);
backdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

// Password visibility
document.querySelectorAll('.ca-pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const hide  = input.type === 'password';
    input.type  = hide ? 'text' : 'password';
    btn.querySelector('i').className = hide ? 'ti ti-eye-off' : 'ti ti-eye';
  });
});

function showError(id, msg) { const el = document.getElementById(id); if (el) { el.textContent = msg; el.hidden = false; } }
function hideError(id)      { const el = document.getElementById(id); if (el) el.hidden = true; }
function clearErrors()      { ['errCaFirstName','errCaLastName','errCaEmail','errCaUsername','errCaRole','errCaPassword','errCaConfirmPassword'].forEach(hideError); form.querySelectorAll('.ca-input').forEach(i => i.classList.remove('is-invalid')); }
function markInvalid(inputId, errorId, msg) { const i = document.getElementById(inputId); if (i) i.classList.add('is-invalid'); showError(errorId, msg); }

document.getElementById('btnSubmitCreate').addEventListener('click', async () => {
  clearErrors();

  const firstName = document.getElementById('caFirstName').value.trim();
  const lastName  = document.getElementById('caLastName').value.trim();
  const email     = document.getElementById('caEmail').value.trim();
  const username  = document.getElementById('caUsername').value.trim();
  const position  = document.getElementById('caRole').value;
  const password  = document.getElementById('caPassword').value;
  const confirm   = document.getElementById('caConfirmPassword').value;

  let valid = true;
  if (!firstName)                                    { markInvalid('caFirstName','errCaFirstName','Required.');           valid = false; }
  if (!lastName)                                     { markInvalid('caLastName', 'errCaLastName', 'Required.');           valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markInvalid('caEmail','errCaEmail','Valid email required.');  valid = false; }
  if (!username || !/^[A-Za-z0-9_\-. ]{3,40}$/.test(username)) { markInvalid('caUsername','errCaUsername','3–40 chars; letters, numbers, _ - . and space only.'); valid = false; }
  if (!position)                                     { markInvalid('caRole',     'errCaRole',    'Select a position.');    valid = false; }
  if (!password || password.length < 8)              { markInvalid('caPassword', 'errCaPassword','Min 8 characters.');    valid = false; }
  if (password !== confirm)                          { markInvalid('caConfirmPassword','errCaConfirmPassword','Passwords do not match.'); valid = false; }
  if (!valid) return;

  const btn = document.getElementById('btnSubmitCreate');
  btn.disabled = true; btn.textContent = 'Creating…';

  try {
    await createUser({ username, email, password, first_name: firstName, last_name: lastName, position, role: 'user' });
    toast('Account created successfully.');
    closeModal();
    loadUsers(currentPage);
  } catch (err) {
    toast(err.message, false);
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="ti ti-user-plus"></i> Create Account';
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadUsers(1);
