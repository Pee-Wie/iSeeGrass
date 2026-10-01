/**
 * iSeeGrass — Profile page script
 * Handles: profile load/save (localStorage), avatar upload/preview,
 *          password change validation, strength meter, toast notifications.
 */

'use strict';

/* ─── Storage key ───────────────────────────────────────────── */
const PROFILE_KEY  = 'isee_user_profile';
const AVATAR_KEY   = 'isee_user_avatar';
const JOINED_KEY   = 'isee_user_joined'; // set once at registration, never overwritten

/* ─── Default profile shape ─────────────────────────────────── */
const DEFAULT_PROFILE = {
  firstName:    '',
  middleName:   '',
  lastName:     '',
  email:        '',
  username:     '',
  role:         'Researcher',
  institution:  '',
  bio:          '',
  phone:        '',
};

/* ─── DOM refs — personal form ──────────────────────────────── */
const formPersonal     = document.getElementById('formPersonal');
const fieldFirstName   = document.getElementById('fieldFirstName');
const fieldMiddleName  = document.getElementById('fieldMiddleName');
const fieldLastName    = document.getElementById('fieldLastName');
const fieldEmail       = document.getElementById('fieldEmail');
const fieldUsername    = document.getElementById('fieldUsername');
const fieldRole        = document.getElementById('fieldRole');
const fieldInstitution = document.getElementById('fieldInstitution');
const fieldBio         = document.getElementById('fieldBio');
const bioCharCount     = document.getElementById('bioCharCount');
const btnResetPersonal = document.getElementById('btnResetPersonal');
const btnSavePersonal  = document.getElementById('btnSavePersonal');

/* ─── DOM refs — contact info ───────────────────────────────── */
const fieldPhone        = document.getElementById('fieldPhone');

/* ─── DOM refs — joined since (read-only) ───────────────────── */
const fieldJoinedSince = document.getElementById('fieldJoinedSince');

/* ─── DOM refs — avatar ─────────────────────────────────────── */
const avatarInput       = document.getElementById('avatarInput');
const avatarImg         = document.getElementById('avatarImg');
const avatarInitials    = document.getElementById('avatarInitials');
const avatarThumbImg    = document.getElementById('avatarThumbImg');
const avatarThumbInit   = document.getElementById('avatarThumbInitials');
const btnRemoveAvatar   = document.getElementById('btnRemoveAvatar');

/* ─── DOM refs — sidebar card ───────────────────────────────── */
const cardDisplayName  = document.getElementById('cardDisplayName');
const cardDisplayRole  = document.getElementById('cardDisplayRole');
const cardDisplayEmail = document.getElementById('cardDisplayEmail');

/* ─── DOM refs — password form ──────────────────────────────── */
const formPassword     = document.getElementById('formPassword');
const fieldCurrentPw   = document.getElementById('fieldCurrentPw');
const fieldNewPw       = document.getElementById('fieldNewPw');
const fieldConfirmPw   = document.getElementById('fieldConfirmPw');
const pwStrengthWrap   = document.getElementById('pwStrengthWrap');
const pwStrengthFill   = document.getElementById('pwStrengthFill');
const pwStrengthLabel  = document.getElementById('pwStrengthLabel');
const btnResetPassword = document.getElementById('btnResetPassword');

/* ─── DOM refs — stat chips ─────────────────────────────────── */
const statIdentifications = document.getElementById('statIdentifications');
const statObservations    = document.getElementById('statObservations');
const statSpecies         = document.getElementById('statSpecies');

/* ─── DOM refs — toast ──────────────────────────────────────── */
const profileToast    = document.getElementById('profileToast');
const profileToastMsg = document.getElementById('profileToastMsg');

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */

/** Show a toast message for `duration` ms. */
let toastTimer = null;
function showToast(msg, isError = false) {
  profileToastMsg.textContent = msg;

  const icon = profileToast.querySelector('.profile-toast__icon');
  if (icon) {
    icon.className = isError
      ? 'ti ti-alert-circle profile-toast__icon'
      : 'ti ti-circle-check profile-toast__icon';
    icon.style.color = isError ? '#e05252' : '#84d64f';
  }

  profileToast.removeAttribute('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    profileToast.setAttribute('hidden', '');
  }, 3200);
}

/** Derive initials from first + last name (falls back to 'U'). */
function getInitials(first, last) {
  const a = (first || '').trim()[0] || '';
  const b = (last  || '').trim()[0] || '';
  return (a + b).toUpperCase() || 'U';
}

/** Set / clear inline validation state on an input. */
function setValid(input, errorEl) {
  input.classList.remove('is-invalid');
  errorEl.setAttribute('hidden', '');
}

function setInvalid(input, errorEl) {
  input.classList.add('is-invalid');
  errorEl.removeAttribute('hidden');
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE PERSISTENCE
═══════════════════════════════════════════════════════════════ */

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

/* ─── Populate form fields from stored data ──────────────────── */
function populateForm(profile) {
  fieldFirstName.value    = profile.firstName;
  fieldMiddleName.value   = profile.middleName   || '';
  fieldLastName.value     = profile.lastName;
  fieldEmail.value        = profile.email;
  fieldUsername.value     = profile.username;
  fieldRole.value         = profile.role;
  fieldInstitution.value  = profile.institution;
  fieldBio.value          = profile.bio;
  fieldPhone.value        = profile.phone        || '';
  bioCharCount.textContent = String(profile.bio.length);
  updateSidebarCard(profile);
}

/* ─── Update the aside card display ─────────────────────────── */
function updateSidebarCard(profile) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'User';
  cardDisplayName.textContent  = fullName;
  cardDisplayRole.textContent  = profile.role || 'Researcher';
  cardDisplayEmail.textContent = profile.email || '—';

  const initials = getInitials(profile.firstName, profile.lastName);
  avatarInitials.textContent = initials;
  avatarThumbInit.textContent = initials;
}

/* ═══════════════════════════════════════════════════════════════
   AVATAR HANDLING
═══════════════════════════════════════════════════════════════ */

function applyAvatar(dataUrl) {
  if (dataUrl) {
    avatarImg.src = dataUrl;
    avatarImg.removeAttribute('hidden');
    avatarInitials.style.display = 'none';

    avatarThumbImg.src = dataUrl;
    avatarThumbImg.removeAttribute('hidden');
    avatarThumbInit.style.display = 'none';
  } else {
    clearAvatar();
  }
}

function clearAvatar() {
  avatarImg.src = '';
  avatarImg.setAttribute('hidden', '');
  avatarInitials.style.display = '';

  avatarThumbImg.src = '';
  avatarThumbImg.setAttribute('hidden', '');
  avatarThumbInit.style.display = '';
}

avatarInput.addEventListener('change', () => {
  const file = avatarInput.files[0];
  if (!file) return;

  // Guard: accept images only, max 4 MB
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file.', true);
    avatarInput.value = '';
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    showToast('Image must be smaller than 4 MB.', true);
    avatarInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    localStorage.setItem(AVATAR_KEY, dataUrl);
    applyAvatar(dataUrl);
    showToast('Profile picture updated.');
  };
  reader.readAsDataURL(file);
});

btnRemoveAvatar.addEventListener('click', () => {
  localStorage.removeItem(AVATAR_KEY);
  clearAvatar();
  avatarInput.value = '';
  showToast('Profile picture removed.');
});

/* ═══════════════════════════════════════════════════════════════
   BIO CHARACTER COUNTER
═══════════════════════════════════════════════════════════════ */

fieldBio.addEventListener('input', () => {
  bioCharCount.textContent = String(fieldBio.value.length);
});

/* ═══════════════════════════════════════════════════════════════
   PERSONAL FORM — validation & save
═══════════════════════════════════════════════════════════════ */

function validatePersonalForm() {
  let valid = true;

  /* First name */
  const errFirstName = document.getElementById('errFirstName');
  if (!fieldFirstName.value.trim()) {
    setInvalid(fieldFirstName, errFirstName);
    valid = false;
  } else {
    setValid(fieldFirstName, errFirstName);
  }

  /* Last name */
  const errLastName = document.getElementById('errLastName');
  if (!fieldLastName.value.trim()) {
    setInvalid(fieldLastName, errLastName);
    valid = false;
  } else {
    setValid(fieldLastName, errLastName);
  }

  /* Email */
  const errEmail = document.getElementById('errEmail');
  const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(fieldEmail.value.trim())) {
    setInvalid(fieldEmail, errEmail);
    valid = false;
  } else {
    setValid(fieldEmail, errEmail);
  }

  /* Username */
  const errUsername = document.getElementById('errUsername');
  const usernameRe  = /^[A-Za-z0-9_\-]{3,40}$/;
  if (!usernameRe.test(fieldUsername.value.trim())) {
    setInvalid(fieldUsername, errUsername);
    valid = false;
  } else {
    setValid(fieldUsername, errUsername);
  }

  /* Phone — optional, but if filled must look like a phone number */
  const errPhone = document.getElementById('errPhone');
  const phoneVal = fieldPhone.value.trim();
  const phoneRe  = /^[\+\d][\d\s\-\(\)]{6,28}$/;
  if (phoneVal && !phoneRe.test(phoneVal)) {
    setInvalid(fieldPhone, errPhone);
    valid = false;
  } else {
    setValid(fieldPhone, errPhone);
  }

  return valid;
}

/* Clear invalid state on input to give live feedback */
[fieldFirstName, fieldLastName, fieldEmail, fieldUsername, fieldPhone].forEach((field) => {
  field.addEventListener('input', () => {
    field.classList.remove('is-invalid');
  });
});

formPersonal.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validatePersonalForm()) return;

  const profile = {
    firstName:    fieldFirstName.value.trim(),
    middleName:   fieldMiddleName.value.trim(),
    lastName:     fieldLastName.value.trim(),
    email:        fieldEmail.value.trim(),
    username:     fieldUsername.value.trim(),
    role:         fieldRole.value,
    institution:  fieldInstitution.value.trim(),
    bio:          fieldBio.value.trim(),
    phone:        fieldPhone.value.trim(),
  };

  saveProfile(profile);
  updateSidebarCard(profile);

  // Brief disabled state to signal success
  btnSavePersonal.disabled = true;
  btnSavePersonal.querySelector('span').textContent = 'Saved!';
  setTimeout(() => {
    btnSavePersonal.disabled = false;
    btnSavePersonal.querySelector('span').textContent = 'Save Changes';
  }, 1800);

  showToast('Profile updated successfully.');
});

btnResetPersonal.addEventListener('click', () => {
  const profile = loadProfile();
  populateForm(profile);
  // Clear any validation state
  formPersonal.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  formPersonal.querySelectorAll('.prof-form__error').forEach((el) => el.setAttribute('hidden', ''));
});

/* ═══════════════════════════════════════════════════════════════
   PASSWORD STRENGTH METER
═══════════════════════════════════════════════════════════════ */

function scorePassword(pw) {
  if (!pw || pw.length < 4) return { level: null, label: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { level: 'weak',   label: 'Weak'   };
  if (score <= 3) return { level: 'fair',   label: 'Fair'   };
  return           { level: 'strong', label: 'Strong' };
}

fieldNewPw.addEventListener('input', () => {
  const pw = fieldNewPw.value;
  if (!pw) {
    pwStrengthWrap.setAttribute('hidden', '');
    return;
  }
  pwStrengthWrap.removeAttribute('hidden');
  const { level, label } = scorePassword(pw);
  if (level) {
    pwStrengthFill.setAttribute('data-level', level);
    pwStrengthLabel.setAttribute('data-level', level);
    pwStrengthLabel.textContent = label;
  }

  // Live clear of invalid state
  fieldNewPw.classList.remove('is-invalid');
});

/* ═══════════════════════════════════════════════════════════════
   PASSWORD FORM — validation & save
═══════════════════════════════════════════════════════════════ */

function validatePasswordForm() {
  let valid = true;

  const errCurrentPw = document.getElementById('errCurrentPw');
  if (!fieldCurrentPw.value) {
    setInvalid(fieldCurrentPw, errCurrentPw);
    valid = false;
  } else {
    setValid(fieldCurrentPw, errCurrentPw);
  }

  const errNewPw = document.getElementById('errNewPw');
  if (fieldNewPw.value.length < 8) {
    setInvalid(fieldNewPw, errNewPw);
    valid = false;
  } else {
    setValid(fieldNewPw, errNewPw);
  }

  const errConfirmPw = document.getElementById('errConfirmPw');
  if (fieldNewPw.value !== fieldConfirmPw.value || !fieldConfirmPw.value) {
    setInvalid(fieldConfirmPw, errConfirmPw);
    valid = false;
  } else {
    setValid(fieldConfirmPw, errConfirmPw);
  }

  return valid;
}

formPassword.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validatePasswordForm()) return;

  /*
   * NOTE: Real password update must be handled server-side.
   * This is a placeholder that clears the form and confirms to the user.
   * Wire `fieldCurrentPw.value` + `fieldNewPw.value` to your API here.
   */
  formPassword.reset();
  pwStrengthWrap.setAttribute('hidden', '');
  formPassword.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  showToast('Password updated. Please re-login if needed.');
});

btnResetPassword.addEventListener('click', () => {
  formPassword.reset();
  pwStrengthWrap.setAttribute('hidden', '');
  formPassword.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  formPassword.querySelectorAll('.prof-form__error').forEach((el) => el.setAttribute('hidden', ''));
});

/* ═══════════════════════════════════════════════════════════════
   PASSWORD VISIBILITY TOGGLES
═══════════════════════════════════════════════════════════════ */

document.querySelectorAll('.prof-pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
    }
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });
});

/* ═══════════════════════════════════════════════════════════════
   STATS — pull from same localStorage keys as dashboard
═══════════════════════════════════════════════════════════════ */

function loadStats() {
  try {
    const obs = JSON.parse(localStorage.getItem('isee_observations') || '[]');

    const totalObs       = obs.length;
    const uniqueSpecies  = new Set(obs.map((o) => o.species).filter(Boolean)).size;

    // Identifications: stored separately as a simple counter
    const identCount = parseInt(localStorage.getItem('isee_id_count') || '0', 10);

    statIdentifications.textContent = identCount > 0 ? identCount : '—';
    statObservations.textContent    = totalObs    > 0 ? totalObs  : '—';
    statSpecies.textContent         = uniqueSpecies > 0 ? uniqueSpecies : '—';
  } catch {
    /* non-critical — leave as — */
  }
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */

(function init() {
  // Load saved profile into form and sidebar card
  const profile = loadProfile();
  populateForm(profile);

  // Load saved avatar
  const savedAvatar = localStorage.getItem(AVATAR_KEY);
  if (savedAvatar) applyAvatar(savedAvatar);

  // Load activity stats
  loadStats();

  // ── Joined Since (read-only, set once at registration) ──
  // If not yet stored, stamp now (simulates first-time account creation).
  // In a real backend scenario, this would come from the server/auth token.
  let joinedDate = localStorage.getItem(JOINED_KEY);
  if (!joinedDate) {
    joinedDate = new Date().toISOString();
    localStorage.setItem(JOINED_KEY, joinedDate);
  }
  try {
    const d = new Date(joinedDate);
    fieldJoinedSince.textContent = d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    fieldJoinedSince.textContent = joinedDate;
  }
})();
