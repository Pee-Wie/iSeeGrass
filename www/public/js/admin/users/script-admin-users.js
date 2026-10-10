/* ══════════════════════════════════════════════════════════════
   Admin Users — Create Account Modal
   ══════════════════════════════════════════════════════════════ */

const modal    = document.getElementById('createAccountModal');
const backdrop = document.getElementById('createAccountBackdrop');
const form     = document.getElementById('createAccountForm');

/* ── Open / close ─────────────────────────────────────────────── */

function openModal() {
    form.reset();
    clearErrors();
    modal.hidden    = false;
    backdrop.hidden = false;
    backdrop.removeAttribute('aria-hidden');
    modal.removeAttribute('aria-hidden');
    document.getElementById('caFirstName').focus();
}

function closeModal() {
    modal.hidden    = true;
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('btnCreateAccount').addEventListener('click', openModal);
document.getElementById('btnCloseCreateModal').addEventListener('click', closeModal);
document.getElementById('btnCancelCreate').addEventListener('click', closeModal);
backdrop.addEventListener('click', closeModal);

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
});

/* ── Password visibility toggles ─────────────────────────────── */

document.querySelectorAll('.ca-pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        btn.querySelector('i').className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
    });
});

/* ── Validation helpers ───────────────────────────────────────── */

function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
}

function clearErrors() {
    ['errCaFirstName', 'errCaLastName', 'errCaEmail',
     'errCaUsername', 'errCaRole', 'errCaPassword', 'errCaConfirmPassword']
        .forEach(hideError);
    form.querySelectorAll('.ca-input').forEach(i => i.classList.remove('is-invalid'));
}

function markInvalid(inputId, errorId, msg) {
    const input = document.getElementById(inputId);
    if (input) input.classList.add('is-invalid');
    showError(errorId, msg);
}

/* ── Submit ───────────────────────────────────────────────────── */

document.getElementById('btnSubmitCreate').addEventListener('click', () => {
    clearErrors();

    const firstName       = document.getElementById('caFirstName').value.trim();
    const lastName        = document.getElementById('caLastName').value.trim();
    const email           = document.getElementById('caEmail').value.trim();
    const username        = document.getElementById('caUsername').value.trim();
    const role            = document.getElementById('caRole').value;
    const password        = document.getElementById('caPassword').value;
    const confirmPassword = document.getElementById('caConfirmPassword').value;

    let valid = true;

    if (!firstName) {
        markInvalid('caFirstName', 'errCaFirstName', 'First name is required.');
        valid = false;
    }
    if (!lastName) {
        markInvalid('caLastName', 'errCaLastName', 'Last name is required.');
        valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        markInvalid('caEmail', 'errCaEmail', 'Enter a valid email address.');
        valid = false;
    }
    if (!username || !/^[A-Za-z0-9_\-]{3,40}$/.test(username)) {
        markInvalid('caUsername', 'errCaUsername', '3–40 chars; letters, numbers, _ and - only.');
        valid = false;
    }
    if (!role) {
        markInvalid('caRole', 'errCaRole', 'Please select a position.');
        valid = false;
    }
    if (!password || password.length < 8) {
        markInvalid('caPassword', 'errCaPassword', 'At least 8 characters required.');
        valid = false;
    }
    if (password !== confirmPassword) {
        markInvalid('caConfirmPassword', 'errCaConfirmPassword', 'Passwords do not match.');
        valid = false;
    }

    if (!valid) return;

    // TODO: replace with real API call
    console.log('Create account:', { firstName, lastName, email, username, role });
    closeModal();
});
