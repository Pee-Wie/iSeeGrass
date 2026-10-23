/**
 * www/public/js/auth/login.js
 *
 * Handles all behaviour on views/auth/login.html:
 *   - Login form  → POST /api/auth/login → redirect by role
 *   - Sign-up modal (loads signup.html fragment dynamically)
 *   - Register form inside the modal → POST /api/auth/register
 *   - "Forgot password" panel toggle (UI-only for now)
 *   - `?next=` redirect preservation after login
 *
 * Depends on:
 *   ../api/auth.api.js   (login, register)
 *   ../api/client.js     (via auth.api.js)
 *   ../config/api.config.js
 */

'use strict';

import { login, register } from '../api/auth.api.js';

// ── Redirect destinations after a successful login ────────────────────────────
const REDIRECT = {
  admin : '../../views/admin/index.html',
  user  : '../../views/users/index.html',
};

// ── Restore "?next=" destination if present ───────────────────────────────────
function getNextParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('next') || null;
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

/** Show an inline error message below a field. */
function showFieldError(inputEl, message) {
  inputEl.classList.add('input-error');

  let errEl = inputEl.parentElement.querySelector('.field-error-msg');
  if (!errEl) {
    errEl = document.createElement('small');
    errEl.className = 'field-error-msg';
    errEl.style.color = '#e05252';
    errEl.style.display = 'block';
    errEl.style.marginTop = '4px';
    inputEl.after(errEl);
  }
  errEl.textContent = message;
}

/** Clear inline error on a field. */
function clearFieldError(inputEl) {
  inputEl.classList.remove('input-error');
  const errEl = inputEl.parentElement.querySelector('.field-error-msg');
  if (errEl) errEl.textContent = '';
}

/** Show a banner error message inside a form container. */
function showFormError(containerId, message) {
  let banner = document.getElementById(containerId);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = containerId;
    banner.style.cssText = 'background:#ffe0e0;color:#b00;border:1px solid #f5a0a0;' +
      'border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:.9rem;';
  }
  banner.textContent = message;
  banner.hidden = false;
  return banner;
}

function hideFormError(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.hidden = true;
}

/** Disable/enable a submit button and swap its label. */
function setButtonLoading(btn, loading, originalText) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : originalText;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN FORM
// ─────────────────────────────────────────────────────────────────────────────

(function initLoginForm() {
  const form        = document.getElementById('loginFormElem');
  const usernameEl  = document.getElementById('username');
  const passwordEl  = document.getElementById('password');
  const submitBtn   = form?.querySelector('button[type="submit"]');

  if (!form) return;

  // Remove the old onclick hard-redirect from the button
  if (submitBtn) submitBtn.removeAttribute('onclick');

  // Live clear errors on input
  usernameEl?.addEventListener('input', () => clearFieldError(usernameEl));
  passwordEl?.addEventListener('input', () => clearFieldError(passwordEl));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormError('loginBannerError');

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    // ── Client-side validation ────────────────────────────────────
    let valid = true;
    if (!username) {
      showFieldError(usernameEl, 'Username is required.');
      valid = false;
    }
    if (!password) {
      showFieldError(passwordEl, 'Password is required.');
      valid = false;
    }
    if (!valid) return;

    // ── Submit ────────────────────────────────────────────────────
    setButtonLoading(submitBtn, true, 'Sign in');

    try {
      const user = await login(username, password);

      // Persist a minimal user object in localStorage so it survives app restarts
      // and offline launches. sessionStorage is wiped when the Android WebView is
      // destroyed (home, recent-apps, or back-to-exit), so we use localStorage here.
      localStorage.setItem('isee_user', JSON.stringify({
        id         : user.id,
        username   : user.username,
        first_name : user.first_name,
        last_name  : user.last_name,
        role       : user.role,
        avatar_url : user.avatar_url ?? null,
      }));

      // Notify every other tab logged in on this browser to log out immediately.
      // Write a timestamp FIRST so the listener on this same tab (after redirect)
      // can recognise the message as its own and skip it.
      try {
        const loginAt = Date.now();
        localStorage.setItem('isee_own_login_at', String(loginAt));

        const ch = new BroadcastChannel('iseegrass_session');
        ch.postMessage({ type: 'session-started', userId: user.id, loginAt });
        ch.close();
      } catch (_) {
        // BroadcastChannel not supported (very old browsers) — gracefully skip
      }

      // Redirect: honour `?next=` first, then role-based default
      const next = getNextParam();
      if (next) {
        window.location.href = decodeURIComponent(next);
      } else {
        window.location.href = user.role === 'admin' ? REDIRECT.admin : REDIRECT.user;
      }

    } catch (err) {
      setButtonLoading(submitBtn, false, 'Sign in');

      const msg = err.message || 'Login failed. Please try again.';
      const banner = showFormError('loginBannerError', msg);

      // Insert banner before the first input-box if not already in the form
      if (!form.contains(banner)) {
        form.prepend(banner);
      }
    }
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD PANEL (UI toggle — no API yet)
// ─────────────────────────────────────────────────────────────────────────────

function toggleForm() {
  const wrapper     = document.getElementById('wrapper');
  const loginBox    = document.getElementById('loginForm');
  const registerBox = document.getElementById('registerForm');

  if (!wrapper) return;
  wrapper.classList.toggle('active');

  const isActive = wrapper.classList.contains('active');
  if (loginBox)    loginBox.style.display    = isActive ? 'none'  : 'block';
  if (registerBox) registerBox.style.display = isActive ? 'block' : 'none';
}

// Expose for the onclick in the HTML
window.toggleForm = toggleForm;

// ─────────────────────────────────────────────────────────────────────────────
// SIGNUP MODAL
// ─────────────────────────────────────────────────────────────────────────────

function openSignupModal() {
  const modal          = document.getElementById('signupModal');
  const formContainer  = document.getElementById('signupFormContainer');
  if (!modal || !formContainer) return;

  fetch('signup.html')
    .then(r => r.text())
    .then(html => {
      const parser  = new DOMParser();
      const doc     = parser.parseFromString(html, 'text/html');
      const content = doc.querySelector('.form-container');
      formContainer.innerHTML = content ? content.outerHTML : html;
      modal.classList.add('active');
      wireSignupForm();
    })
    .catch(() => {
      formContainer.innerHTML =
        '<p style="color:#b00;padding:1rem">Could not load the sign-up form. Please try again.</p>';
      modal.classList.add('active');
    });
}

function closeSignupModal() {
  const modal = document.getElementById('signupModal');
  if (modal) modal.classList.remove('active');
}

// Expose for onclick in HTML and in signup.html fragment
window.openSignupModal  = openSignupModal;
window.closeSignupModal = closeSignupModal;

// Called by the old login.js API — keep as alias
function requestForm() { openSignupModal(); }
window.requestForm = requestForm;

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER FORM (inside the signup modal fragment)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wire the register form after the signup.html fragment is injected into the DOM.
 * Called each time the modal opens so event listeners attach to the fresh HTML.
 */
function wireSignupForm() {
  const form       = document.getElementById('signupFormElem');
  if (!form) return;

  const submitBtn  = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.removeAttribute('onclick');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormError('signupBannerError');

    // ── Read fields ───────────────────────────────────────────────
    const fullname  = (document.getElementById('signup-fullname')?.value ?? '').trim();
    const username  = (document.getElementById('signup-username')?.value ?? '').trim();
    const email     = (document.getElementById('signup-email')?.value ?? '').trim();
    const password  = document.getElementById('signup-password')?.value ?? '';
    const confirm   = document.getElementById('signup-confirm-password')?.value ?? '';

    // ── Basic client-side validation ─────────────────────────────
    let valid = true;

    const fnEl = document.getElementById('signup-fullname');
    const unEl = document.getElementById('signup-username');
    const emEl = document.getElementById('signup-email');
    const pwEl = document.getElementById('signup-password');
    const cpEl = document.getElementById('signup-confirm-password');

    if (!fullname)          { showFieldError(fnEl, 'Full name is required.');    valid = false; }
    if (!username)          { showFieldError(unEl, 'Username is required.');     valid = false; }
    if (!email)             { showFieldError(emEl, 'Email is required.');        valid = false; }
    if (password.length < 8){ showFieldError(pwEl, 'Minimum 8 characters.');    valid = false; }
    if (password !== confirm){ showFieldError(cpEl, 'Passwords do not match.');  valid = false; }

    if (!valid) return;

    // ── Split "Full Name" into first/last ─────────────────────────
    // The signup form has a single "Full Name" field; the API needs first/last.
    const nameParts = fullname.split(/\s+/);
    const firstName = nameParts[0] ?? fullname;
    const lastName  = nameParts.slice(1).join(' ') || firstName;

    // ── Submit ────────────────────────────────────────────────────
    setButtonLoading(submitBtn, true, 'Create Account');

    try {
      const user = await register({
        username,
        email,
        password,
        first_name : firstName,
        last_name  : lastName,
        position   : 'Student',   // default for self-registration; user can update in profile
      });

      // Store session data and redirect
      localStorage.setItem('isee_user', JSON.stringify({
        id         : user.id,
        username   : user.username,
        first_name : user.first_name,
        last_name  : user.last_name,
        role       : user.role,
        avatar_url : user.avatar_url ?? null,
      }));

      closeSignupModal();
      window.location.href = REDIRECT.user;

    } catch (err) {
      setButtonLoading(submitBtn, false, 'Create Account');

      const msg = err.message || 'Registration failed. Please try again.';
      const container = document.getElementById('signupFormContainer');

      let banner = document.getElementById('signupBannerError');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'signupBannerError';
        banner.style.cssText =
          'background:#ffe0e0;color:#b00;border:1px solid #f5a0a0;' +
          'border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:.9rem;';
        container?.prepend(banner);
      }
      banner.textContent = msg;
      banner.hidden = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP toggle (kept from original login.js — UI only)
// ─────────────────────────────────────────────────────────────────────────────

function toggleLoginAuthFields() {
  const authOtp        = document.getElementById('authOtp');
  const isOtp          = authOtp ? authOtp.checked : false;
  const loginPasswordBox = document.getElementById('loginPasswordBox');
  const loginOtpBox    = document.getElementById('loginOtpBox');

  if (loginPasswordBox) loginPasswordBox.style.display = isOtp ? 'none' : 'block';
  if (loginOtpBox)      loginOtpBox.style.display      = isOtp ? 'block' : 'none';

  const passwordInput = document.querySelector('#loginPasswordBox input[name="password"]');
  const otpInput      = document.querySelector('#loginOtpBox input[name="otp"]');
  if (passwordInput) passwordInput.required = !isOtp;
  if (otpInput)      otpInput.required      = isOtp;
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  // Show a notice if this tab was kicked out by a new login elsewhere
  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'new_session') {
    const form   = document.getElementById('loginFormElem');
    const banner = showFormError('loginBannerError',
      'You were logged out because a new session was started on another tab or device.');
    banner.style.background = '#fff8e0';
    banner.style.color      = '#7a5c00';
    banner.style.border     = '1px solid #f0d080';
    if (form && !form.contains(banner)) form.prepend(banner);
  }

  // OTP toggle init
  const authOtp = document.getElementById('authOtp');
  if (authOtp) {
    authOtp.checked = false;
    authOtp.addEventListener('change', toggleLoginAuthFields);
  }
  toggleLoginAuthFields();

  // Modal backdrop click to close
  const modal = document.getElementById('signupModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSignupModal();
    });
  }

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSignupModal();
  });
});
