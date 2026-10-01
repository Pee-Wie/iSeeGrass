/**
 * iSeeGrass — Custom Modal Utilities
 * Replaces native browser confirm() / alert() with styled in-app dialogs.
 *
 * Usage (works on any page that loads this script):
 *
 *   // Drop-in confirm() replacement — returns Promise<boolean>
 *   const ok = await modalConfirm('Delete this item?', 'Confirm Delete');
 *   if (ok) { ... }
 *
 *   // Drop-in alert() replacement — returns Promise<void>
 *   await modalAlert('File exceeds the 5 MB limit.', 'Upload Error');
 *
 * Both functions are attached to `window` so plain (non-module) scripts
 * can call them too:  window.modalConfirm(...)  /  window.modalAlert(...)
 */

'use strict';

/* ─── Inject modal HTML + CSS once ───────────────────────────────── */

function _ensureDOM() {
  if (document.getElementById('isg-modal-root')) return;

  /* ── Stylesheet ── */
  const style = document.createElement('style');
  style.id = 'isg-modal-style';
  style.textContent = `
  /* iSeeGrass custom modal system */
  .isg-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(4, 12, 6, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: isg-fade-in 160ms ease;
  }

  @keyframes isg-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .isg-modal-card {
    background: rgba(18, 46, 22, 0.98);
    border: 1px solid rgba(142, 214, 85, 0.28);
    border-radius: 20px;
    width: 100%;
    max-width: 400px;
    box-shadow:
      0 4px 6px rgba(0,0,0,0.08),
      0 16px 40px rgba(0,0,0,0.42),
      inset 0 0 0 1px rgba(142, 214, 85, 0.07);
    overflow: hidden;
    animation: isg-pop-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes isg-pop-in {
    from { opacity: 0; transform: scale(0.92) translateY(12px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }

  .isg-modal-header {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 1rem 1.15rem 0.85rem;
    border-bottom: 1px solid rgba(142, 214, 85, 0.13);
    background: rgba(142, 214, 85, 0.07);
  }

  .isg-modal-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .isg-modal-icon--confirm {
    background: rgba(220, 160, 30, 0.18);
    border: 1px solid rgba(220, 160, 30, 0.32);
    color: #f0c040;
  }

  .isg-modal-icon--alert {
    background: rgba(142, 214, 85, 0.14);
    border: 1px solid rgba(142, 214, 85, 0.28);
    color: #8ed655;
  }

  .isg-modal-icon--error {
    background: rgba(220, 55, 55, 0.16);
    border: 1px solid rgba(220, 55, 55, 0.30);
    color: #ff8080;
  }

  .isg-modal-icon--info {
    background: rgba(80, 160, 230, 0.16);
    border: 1px solid rgba(80, 160, 230, 0.30);
    color: #80c0ff;
  }

  .isg-modal-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: #dff5c8;
    line-height: 1.3;
    font-family: inherit;
  }

  .isg-modal-body {
    padding: 1.1rem 1.15rem 0.9rem;
  }

  .isg-modal-message {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.65;
    color: #c4ddc0;
    white-space: pre-wrap;
    font-family: inherit;
  }

  .isg-modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.55rem;
    padding: 0.75rem 1.15rem 1rem;
    border-top: 1px solid rgba(142, 214, 85, 0.10);
    background: rgba(0,0,0,0.10);
  }

  .isg-modal-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0.5rem 1.1rem;
    border-radius: 9px;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
    line-height: 1;
    transition: background 120ms ease, border-color 120ms ease, transform 100ms ease;
    white-space: nowrap;
  }

  .isg-modal-btn:hover  { transform: translateY(-1px); }
  .isg-modal-btn:active { transform: translateY(0); }

  .isg-modal-btn:focus-visible {
    outline: 2px solid rgba(142, 214, 85, 0.7);
    outline-offset: 2px;
  }

  .isg-modal-btn--cancel {
    background: transparent;
    border-color: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.50);
  }

  .isg-modal-btn--cancel:hover {
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.24);
    color: rgba(255,255,255,0.85);
  }

  .isg-modal-btn--confirm {
    background: linear-gradient(135deg, #dc6030, #a03018);
    border-color: rgba(200, 80, 40, 0.8);
    color: #fff;
    box-shadow: 0 2px 8px rgba(180, 60, 30, 0.28);
  }

  .isg-modal-btn--confirm:hover {
    background: linear-gradient(135deg, #e87040, #b84020);
    box-shadow: 0 4px 14px rgba(180, 60, 30, 0.42);
  }

  .isg-modal-btn--ok {
    background: linear-gradient(135deg, #6abf36, #3d8018);
    border-color: rgba(90,170,42,0.8);
    color: #fff;
    box-shadow: 0 2px 8px rgba(60, 140, 30, 0.28);
  }

  .isg-modal-btn--ok:hover {
    background: linear-gradient(135deg, #7ed045, #4a9a22);
    box-shadow: 0 4px 14px rgba(60, 140, 30, 0.42);
  }
  `;
  document.head.appendChild(style);

  /* ── Mount point ── */
  const root = document.createElement('div');
  root.id = 'isg-modal-root';
  document.body.appendChild(root);
}

/* ─── Icon SVGs ───────────────────────────────────────────────────── */

const _ICONS = {
  confirm: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>`,
};

/* ─── Core renderer ───────────────────────────────────────────────── */

/**
 * @param {{
 *   type:      'confirm' | 'alert' | 'error' | 'info',
 *   title:     string,
 *   message:   string,
 *   okLabel:   string,
 *   cancelLabel?: string,
 * }} opts
 * @returns {Promise<boolean>}  resolves true = OK/Confirm, false = Cancel/dismiss
 */
function _show(opts) {
  _ensureDOM();

  return new Promise(resolve => {
    const root = document.getElementById('isg-modal-root');

    /* ── Build DOM ── */
    const backdrop = document.createElement('div');
    backdrop.className = 'isg-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'isg-modal-title');
    backdrop.setAttribute('aria-describedby', 'isg-modal-msg');

    const isConfirm   = opts.type === 'confirm';
    const iconCls     = `isg-modal-icon--${opts.type}`;
    const confirmBtnCls = isConfirm ? 'isg-modal-btn--confirm' : 'isg-modal-btn--ok';

    backdrop.innerHTML = `
      <div class="isg-modal-card">
        <div class="isg-modal-header">
          <span class="isg-modal-icon ${iconCls}" aria-hidden="true">
            ${_ICONS[opts.type] || _ICONS.info}
          </span>
          <h2 class="isg-modal-title" id="isg-modal-title">${opts.title}</h2>
        </div>
        <div class="isg-modal-body">
          <p class="isg-modal-message" id="isg-modal-msg">${opts.message}</p>
        </div>
        <div class="isg-modal-footer">
          ${isConfirm
            ? `<button class="isg-modal-btn isg-modal-btn--cancel" id="isg-cancel-btn" type="button">
                 ${opts.cancelLabel || 'Cancel'}
               </button>`
            : ''}
          <button class="isg-modal-btn ${confirmBtnCls}" id="isg-ok-btn" type="button">
            ${opts.okLabel}
          </button>
        </div>
      </div>`;

    root.appendChild(backdrop);

    /* ── Focus the primary button ── */
    const okBtn     = backdrop.querySelector('#isg-ok-btn');
    const cancelBtn = backdrop.querySelector('#isg-cancel-btn');

    requestAnimationFrame(() => {
      // Focus cancel on confirm dialogs (safer default), OK on alerts
      (isConfirm && cancelBtn ? cancelBtn : okBtn).focus();
    });

    /* ── Resolve helpers ── */
    const close = (result) => {
      backdrop.style.animation = 'isg-fade-in 140ms ease reverse forwards';
      setTimeout(() => {
        root.removeChild(backdrop);
        resolve(result);
      }, 130);
    };

    okBtn.addEventListener('click', () => close(true));
    if (cancelBtn) cancelBtn.addEventListener('click', () => close(false));

    /* ── Keyboard: Escape = cancel/dismiss, Enter = confirm ── */
    backdrop.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      if (e.key === 'Enter' && document.activeElement === okBtn) {
        e.preventDefault(); close(true);
      }
    });

    /* ── Click outside card = dismiss ── */
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) close(false);
    });
  });
}

/* ─── Public API ──────────────────────────────────────────────────── */

/**
 * Drop-in replacement for confirm().
 * @param {string} message
 * @param {string} [title='Confirm']
 * @param {string} [confirmLabel='Confirm']
 * @returns {Promise<boolean>}
 */
async function modalConfirm(message, title = 'Confirm', confirmLabel = 'Confirm') {
  return _show({
    type:        'confirm',
    title,
    message,
    okLabel:     confirmLabel,
    cancelLabel: 'Cancel',
  });
}

/**
 * Drop-in replacement for alert().
 * @param {string} message
 * @param {string} [title='Notice']
 * @param {'alert'|'error'|'info'} [variant='alert']
 * @returns {Promise<void>}
 */
async function modalAlert(message, title = 'Notice', variant = 'alert') {
  await _show({
    type:    variant,
    title,
    message,
    okLabel: 'OK',
  });
}

/* ─── Expose globally so non-module scripts can use them ─────────── */
window.modalConfirm = modalConfirm;
window.modalAlert   = modalAlert;

export { modalConfirm, modalAlert };
