/**
 * iSeeGrass — Profile page
 * Loads user from API session, saves changes via API.
 * Avatar is stored server-side; uploaded via /users/avatar endpoint.
 */
'use strict';

import { me }                         from '../../api/auth.api.js';
import { updateUser, changePassword } from '../../api/users.api.js';
import { get, upload }                from '../../api/client.js';
import { apiUrl }                     from '../../config/api.config.js';

// ── Current user (set after me()) ─────────────────────────────────────────────
let currentUser = null;

// ── DOM shortcuts ─────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const formPersonal = $('formPersonal');
const formPassword = $('formPassword');

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  const toast = $('profileToast');
  const msgEl = $('profileToastMsg');
  const icon  = toast?.querySelector('.profile-toast__icon');
  if (msgEl) msgEl.textContent = msg;
  if (icon)  icon.className = isError
    ? 'ti ti-alert-circle profile-toast__icon'
    : 'ti ti-circle-check profile-toast__icon';
  if (icon)  icon.style.color = isError ? '#e05252' : '#84d64f';
  toast?.removeAttribute('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast?.setAttribute('hidden',''), 3200);
}

// ── Validation helpers ────────────────────────────────────────────────────────
function setValid(input, errEl)   { input?.classList.remove('is-invalid'); errEl?.setAttribute('hidden',''); }
function setInvalid(input, errEl) { input?.classList.add('is-invalid');    errEl?.removeAttribute('hidden'); }

// ── Initials ──────────────────────────────────────────────────────────────────
function initials(first, last) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || 'U';
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function applyAvatar(dataUrl) {
  const img  = $('avatarImg');
  const init = $('avatarInitials');
  const ti   = $('avatarThumbImg');
  const tini = $('avatarThumbInitials');
  if (dataUrl) {
    if (img)  { img.src = dataUrl; img.removeAttribute('hidden'); }
    if (init) init.style.display = 'none';
    if (ti)   { ti.src = dataUrl; ti.removeAttribute('hidden'); }
    if (tini) tini.style.display = 'none';
  } else {
    if (img)  { img.src = ''; img.setAttribute('hidden',''); }
    if (init) init.style.display = '';
    if (ti)   { ti.src = ''; ti.setAttribute('hidden',''); }
    if (tini) tini.style.display = '';
  }
}

$('avatarInput')?.addEventListener('change', async () => {
  const input = $('avatarInput');
  const file  = input.files[0];
  if (!file) return;

  // Client-side pre-validation
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file.', true);
    input.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image must be smaller than 2 MB.', true);
    input.value = '';
    return;
  }

  // Disable the upload label while uploading
  const uploadLabel = document.querySelector('label[for="avatarInput"]');
  if (uploadLabel) uploadLabel.style.pointerEvents = 'none';

  const fd = new FormData();
  fd.append('avatar', file);

  try {
    const data = await upload('/users/avatar', fd);
    const url  = data.avatar_url ?? null;
    applyAvatar(url);
    if (currentUser) currentUser.avatar_url = url;
    showToast('Profile picture updated.');
  } catch (err) {
    showToast(err.message || 'Failed to upload profile picture.', true);
  } finally {
    if (uploadLabel) uploadLabel.style.pointerEvents = '';
    input.value = '';
  }
});

$('btnRemoveAvatar')?.addEventListener('click', async () => {
  try {
    const res = await fetch(apiUrl('/users/avatar'), { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `Server error (${res.status})`);
    }
    applyAvatar(null);
    if (currentUser) currentUser.avatar_url = null;
    $('avatarInput').value = '';
    showToast('Profile picture removed.');
  } catch (err) {
    showToast(err.message || 'Failed to remove profile picture.', true);
  }
});

// ── Sidebar card ──────────────────────────────────────────────────────────────
function updateSidebarCard(u) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User';
  if ($('cardDisplayName'))  $('cardDisplayName').textContent  = full;
  if ($('cardDisplayRole'))  $('cardDisplayRole').textContent  = u.position || 'Researcher';
  if ($('cardDisplayEmail')) $('cardDisplayEmail').textContent = u.email    || '—';
  if ($('avatarInitials'))   $('avatarInitials').textContent   = initials(u.first_name, u.last_name);
  const ti = $('avatarThumbInitials');
  if (ti) ti.textContent = initials(u.first_name, u.last_name);
}

// ── Populate personal form ────────────────────────────────────────────────────
function populateForm(u) {
  $('fieldFirstName').value   = u.first_name   || '';
  $('fieldMiddleName').value  = u.middle_name  || '';
  $('fieldLastName').value    = u.last_name    || '';
  $('fieldEmail').value       = u.email        || '';
  $('fieldUsername').value    = u.username     || '';
  $('fieldRole').value        = u.position     || 'Researcher';
  $('fieldInstitution').value = u.institution  || '';
  $('fieldBio').value         = u.bio          || '';
  $('fieldPhone').value       = u.phone        || '';
  const bioCount = $('bioCharCount');
  if (bioCount) bioCount.textContent = String((u.bio || '').length);
  updateSidebarCard(u);
}

// ── Bio char counter ──────────────────────────────────────────────────────────
$('fieldBio')?.addEventListener('input', () => {
  const bc = $('bioCharCount');
  if (bc) bc.textContent = String($('fieldBio').value.length);
});

// ── Personal form submit ──────────────────────────────────────────────────────
let btnSavePersonalOrigText = '';
formPersonal?.addEventListener('submit', async e => {
  e.preventDefault();

  const first  = $('fieldFirstName').value.trim();
  const last   = $('fieldLastName').value.trim();
  const email  = $('fieldEmail').value.trim();
  const phone  = $('fieldPhone').value.trim();
  let valid    = true;

  const errF = $('errFirstName'); const errL = $('errLastName');
  const errE = $('errEmail');     const errP = $('errPhone');

  if (!first) { setInvalid($('fieldFirstName'), errF); valid = false; } else setValid($('fieldFirstName'), errF);
  if (!last)  { setInvalid($('fieldLastName'),  errL); valid = false; } else setValid($('fieldLastName'),  errL);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInvalid($('fieldEmail'), errE); valid = false; } else setValid($('fieldEmail'), errE);
  if (phone && !/^[\+\d][\d\s\-\(\)]{6,28}$/.test(phone)) { setInvalid($('fieldPhone'), errP); valid = false; } else setValid($('fieldPhone'), errP);
  if (!valid) return;

  const btn = $('btnSavePersonal');
  btnSavePersonalOrigText = btnSavePersonalOrigText || btn?.querySelector('span')?.textContent || 'Save Changes';
  if (btn) { btn.disabled = true; const sp = btn.querySelector('span'); if (sp) sp.textContent = 'Saving…'; }

  try {
    const updated = await updateUser(currentUser.id, {
      first_name:  first,
      last_name:   last,
      middle_name: $('fieldMiddleName').value.trim() || null,
      email,
      username:    $('fieldUsername').value.trim() || null,
      position:    $('fieldRole').value,
      institution: $('fieldInstitution').value.trim() || null,
      phone:       phone || null,
      bio:         $('fieldBio').value.trim() || null,
    });
    currentUser = updated;
    updateSidebarCard(updated);
    // Update local cache
    const cached = JSON.parse(localStorage.getItem('isee_user') || '{}');
    localStorage.setItem('isee_user', JSON.stringify({ ...cached, ...updated }));
    showToast('Profile updated successfully.');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    if (btn) { btn.disabled = false; const sp = btn.querySelector('span'); if (sp) sp.textContent = btnSavePersonalOrigText; }
  }
});

$('btnResetPersonal')?.addEventListener('click', () => {
  if (currentUser) populateForm(currentUser);
  formPersonal?.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  formPersonal?.querySelectorAll('.prof-form__error').forEach(el => el.setAttribute('hidden',''));
});

// ── Password strength meter ────────────────────────────────────────────────────
function scorePassword(pw) {
  if (!pw || pw.length < 4) return { level: null, label: '' };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 2) return { level:'weak',   label:'Weak' };
  if (s <= 3) return { level:'fair',   label:'Fair' };
  return            { level:'strong', label:'Strong' };
}

$('fieldNewPw')?.addEventListener('input', () => {
  const wrap  = $('pwStrengthWrap');
  const fill  = $('pwStrengthFill');
  const label = $('pwStrengthLabel');
  const pw    = $('fieldNewPw').value;
  if (!pw) { wrap?.setAttribute('hidden',''); return; }
  wrap?.removeAttribute('hidden');
  const { level, label: txt } = scorePassword(pw);
  if (level) {
    fill?.setAttribute('data-level', level);
    label?.setAttribute('data-level', level);
    if (label) label.textContent = txt;
  }
  $('fieldNewPw').classList.remove('is-invalid');
});

// ── Password form submit ──────────────────────────────────────────────────────
formPassword?.addEventListener('submit', async e => {
  e.preventDefault();
  let valid = true;
  const cur  = $('fieldCurrentPw').value;
  const pw   = $('fieldNewPw').value;
  const conf = $('fieldConfirmPw').value;

  const errC  = $('errCurrentPw'); const errN = $('errNewPw'); const errCf = $('errConfirmPw');

  if (!cur)           { setInvalid($('fieldCurrentPw'), errC); valid = false; } else setValid($('fieldCurrentPw'), errC);
  if (pw.length < 8)  { setInvalid($('fieldNewPw'),     errN); valid = false; } else setValid($('fieldNewPw'),     errN);
  if (pw !== conf || !conf) { setInvalid($('fieldConfirmPw'), errCf); valid = false; } else setValid($('fieldConfirmPw'), errCf);
  if (!valid) return;

  const btn = $('btnSavePassword');
  if (btn) { btn.disabled = true; const sp = btn.querySelector('span'); if (sp) sp.textContent = 'Updating…'; }

  try {
    await changePassword(currentUser.id, { current_password: cur, new_password: pw });
    formPassword.reset();
    $('pwStrengthWrap')?.setAttribute('hidden','');
    showToast('Password updated. Please re-login if needed.');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    if (btn) { btn.disabled = false; const sp = btn.querySelector('span'); if (sp) sp.textContent = 'Update Password'; }
  }
});

$('btnResetPassword')?.addEventListener('click', () => {
  formPassword?.reset();
  $('pwStrengthWrap')?.setAttribute('hidden','');
  formPassword?.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  formPassword?.querySelectorAll('.prof-form__error').forEach(el => el.setAttribute('hidden',''));
});

// ── Password visibility toggles ───────────────────────────────────────────────
document.querySelectorAll('.prof-pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = $(btn.dataset.target);
    if (!input) return;
    const hide = input.type === 'password';
    input.type = hide ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) icon.className = hide ? 'ti ti-eye-off' : 'ti ti-eye';
    btn.setAttribute('aria-label', hide ? 'Hide password' : 'Show password');
  });
});

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await get('/dashboard/stats');
    const si = $('statIdentifications');
    const so = $('statObservations');
    const ss = $('statSpecies');
    if (si) si.textContent = data.identifications > 0 ? data.identifications : '—';
    if (so) so.textContent = data.assessments     > 0 ? data.assessments     : '—';
    if (ss) ss.textContent = data.species         > 0 ? data.species         : '—';
  } catch { /* non-critical */ }
}

// ── Joined since ──────────────────────────────────────────────────────────────
function renderJoinedSince(isoDate) {
  const el = $('fieldJoinedSince');
  if (!el || !isoDate) return;
  try {
    el.textContent = new Date(isoDate).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
  } catch { el.textContent = isoDate; }
}

// ── Offline guard ─────────────────────────────────────────────────────────────
// When the device has no network, disable all write actions (save, password
// change, avatar upload/remove) and show a persistent notice at the top of
// the page. Re-enable everything when connectivity returns.
const OFFLINE_NOTICE_ID = 'profileOfflineNotice';

function applyOfflineState(offline) {
  // Disable / enable all submit and mutating buttons
  const writeButtons = [
    $('btnSavePersonal'),
    $('btnSavePassword'),
    document.querySelector('label[for="avatarInput"]'),
    $('btnRemoveAvatar'),
  ];
  writeButtons.forEach(el => {
    if (!el) return;
    if (offline) {
      el.setAttribute('data-was-disabled', el.disabled ? '1' : '0');
      el.disabled = true;
      el.style.opacity = '0.45';
      el.style.cursor  = 'not-allowed';
    } else {
      const wasDisabled = el.getAttribute('data-was-disabled') === '1';
      el.disabled = wasDisabled;
      el.style.opacity = '';
      el.style.cursor  = '';
    }
  });

  // Show / hide the offline notice banner
  let notice = $(OFFLINE_NOTICE_ID);
  if (offline) {
    if (!notice) {
      notice = document.createElement('div');
      notice.id = OFFLINE_NOTICE_ID;
      notice.setAttribute('role', 'status');
      notice.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:0.6rem',
        'background:rgba(60,100,160,0.15)',
        'border:1px solid rgba(80,140,220,0.4)',
        'border-radius:8px',
        'padding:0.65rem 1rem',
        'margin-bottom:1rem',
        'font-size:0.88rem',
        'color:#90c8f0',
      ].join(';');
      notice.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        <span>You're offline — profile changes are disabled. Reconnect to save.</span>`;

      // Insert before the first form section on the page
      const firstSection = document.querySelector('.prof-section, .page-body, main');
      if (firstSection) {
        firstSection.prepend(notice);
      } else {
        document.body.prepend(notice);
      }
    }
    notice.hidden = false;
  } else if (notice) {
    notice.hidden = true;
  }
}

// Apply on load and on connectivity changes
applyOfflineState(!navigator.onLine);
window.addEventListener('online',  () => applyOfflineState(false));
window.addEventListener('offline', () => applyOfflineState(true));

(async function init() {
  try {
    currentUser = await me();
    populateForm(currentUser);
    renderJoinedSince(currentUser.created_at);
    applyAvatar(currentUser.avatar_url ?? null);
    loadStats();
  } catch {
    // me() will redirect to login on 401
  }
})();
