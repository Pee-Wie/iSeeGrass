/**
 * <isee-identify-history> — Identification History Sidebar
 *
 * A right-side slide-in panel that records every identification run
 * made during the current session.
 *
 * Public API (called from script-users-identify.js):
 *   window.identifyHistory.push(entry)  — add a new record
 *   window.identifyHistory.clear()      — wipe all records
 *
 * Entry shape:
 *   {
 *     id:         string,          // unique run ID  (e.g. crypto.randomUUID())
 *     timestamp:  number,          // Date.now()
 *     fileName:   string,          // original filename
 *     thumbUrl:   string,          // object URL for the thumbnail
 *     topSpecies: string,          // top predicted species name
 *     confidence: number,          // 0–100 confidence %
 *     status:     'pending'        // | 'done' | 'error'
 *       | 'done'
 *       | 'error',
 *     errorMsg:   string | null,   // set when status === 'error'
 *   }
 *
 * Toggle:
 *   The panel is opened/closed by calling
 *   document.getElementById('historyToggleBtn').  It can also be
 *   closed via the × button inside the panel or by pressing Escape.
 */

class ISeeIdentifyHistory extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;
    this.dataset.ready = 'true';

    this._records = [];

    this.innerHTML = `
      <!-- Tab button — always visible on the right edge, outside the sliding wrapper -->
      <button class="hist-tab-btn hist-tab-btn--open" id="histTabBtn" type="button"
        aria-label="Toggle identification history" aria-expanded="true"
        aria-controls="histSidebar"
        title="Show/Hide Identification History">
        <svg class="hist-tab-btn__icon" xmlns="http://www.w3.org/2000/svg"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      <!-- Floating re-open button — mobile only, always in DOM, shown when panel is hidden -->
      <button class="hist-mobile-open-btn" id="histMobileOpenBtn" type="button"
        aria-label="Show identification history" title="ID History" hidden>
        <i class="ti ti-clock"></i>
      </button>

      <!-- Sliding wrapper — only this moves in/out -->
      <div class="hist-wrapper" id="histWrapper">
        <aside class="hist-sidebar" id="histSidebar" aria-label="Identification history" aria-hidden="false">

          <!-- Header -->
          <div class="hist-sidebar__header">
            <h3 class="hist-sidebar__title">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ID History
            </h3>
            <div class="hist-sidebar__header-actions">
              <button class="hist-sidebar__clear-btn" id="histClearBtn" type="button"
                aria-label="Clear all history" title="Clear history" hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <!-- Close button — visible on mobile only (tab button is hidden) -->
              <button class="hist-sidebar__close-mobile" id="histCloseMobileBtn" type="button"
                aria-label="Close history panel">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Session badge -->
          <p class="hist-sidebar__session-note">Session only — history resets on page reload.</p>

          <!-- Record list -->
          <div class="hist-sidebar__list" id="histList" aria-live="polite" aria-label="History records">
            <div class="hist-empty" id="histEmpty">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="1.25"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p>No identifications yet.<br>Run the model to see results here.</p>
            </div>
          </div><!-- /.hist-sidebar__list -->

        </aside>
      </div><!-- /.hist-wrapper -->
    `;

    this._wrapper       = this.querySelector('#histWrapper');
    this._sidebar       = this.querySelector('#histSidebar');
    this._list          = this.querySelector('#histList');
    this._empty         = this.querySelector('#histEmpty');
    this._clearBtn      = this.querySelector('#histClearBtn');
    this._tabBtn        = this.querySelector('#histTabBtn');
    this._mobileOpenBtn = this.querySelector('#histMobileOpenBtn');

    // Tab button (desktop) — toggles open/close
    this._tabBtn.addEventListener('click', () => this.toggle());

    // Mobile close button (inside header)
    this.querySelector('#histCloseMobileBtn').addEventListener('click', () => this.close());

    // Mobile floating re-open button (always visible when panel closed)
    this._mobileOpenBtn.addEventListener('click', () => this.open());

    // Clear all
    this._clearBtn.addEventListener('click', () => this.clear());

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Expose on window so script-users-identify.js can call push/clear
    window.identifyHistory = this;
  }

  // ── Open / close ─────────────────────────────────────────────────

  isOpen() {
    return (
      !this._wrapper.classList.contains('hist-wrapper--hidden') &&
      !this._wrapper.classList.contains('hist-wrapper--closing')
    );
  }

  open() {
    this._wrapper.classList.remove('hist-wrapper--closing', 'hist-wrapper--hidden');
    this._tabBtn.classList.add('hist-tab-btn--open');
    this._tabBtn.setAttribute('aria-expanded', 'true');
    // Hide the floating re-open button when panel is visible
    this._mobileOpenBtn.hidden = true;
  }

  close() {
    const wrapper = this._wrapper;
    const tabBtn  = this._tabBtn;

    tabBtn.classList.remove('hist-tab-btn--open');
    tabBtn.setAttribute('aria-expanded', 'false');

    wrapper.classList.add('hist-wrapper--closing');

    const onEnd = () => {
      wrapper.classList.remove('hist-wrapper--closing');
      wrapper.classList.add('hist-wrapper--hidden');
      wrapper.removeEventListener('animationend', onEnd);
      // Show the floating re-open button after panel is fully hidden
      this._mobileOpenBtn.hidden = false;
    };

    wrapper.addEventListener('animationend', onEnd);
  }

  toggle() {
    this.isOpen() ? this.close() : this.open();
  }

  // ── Push a new record ─────────────────────────────────────────────

  /**
   * @param {{ id:string, timestamp:number, fileName:string, thumbUrl:string,
   *           topSpecies:string, confidence:number, status:string, errorMsg:string|null }} entry
   */
  push(entry) {
    this._records.unshift(entry);          // newest first
    this._renderRecord(entry);
    this._clearBtn.hidden = false;
    this._empty.hidden    = true;
  }

  /**
   * Update an existing record (e.g. when the API responds after 'pending').
   * @param {string} id
   * @param {Partial<typeof entry>} patch
   */
  update(id, patch) {
    const rec = this._records.find(r => r.id === id);
    if (!rec) return;
    Object.assign(rec, patch);
    this._refreshCard(id);
  }

  // ── Clear ─────────────────────────────────────────────────────────

  clear() {
    this._records = [];
    // Remove all cards but keep the empty state element
    this._list.querySelectorAll('.hist-card').forEach(el => el.remove());
    this._empty.hidden    = false;
    this._clearBtn.hidden = true;
  }

  // ── Render helpers ────────────────────────────────────────────────

  _renderRecord(entry) {
    const card = this._buildCard(entry);
    // Insert before the empty-state div so empty state stays at the bottom
    this._list.insertBefore(card, this._empty);
  }

  _refreshCard(id) {
    const existing = this._list.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!existing) return;
    const rec  = this._records.find(r => r.id === id);
    if (!rec)   return;
    const fresh = this._buildCard(rec);
    existing.replaceWith(fresh);
  }

  _buildCard(entry) {
    const card = document.createElement('div');
    card.className   = `hist-card hist-card--${entry.status}`;
    card.dataset.id  = entry.id;

    const time = new Date(entry.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

    // Confidence bar width (clamped 0–100)
    const pct = Math.min(100, Math.max(0, entry.confidence ?? 0));

    // Status badge
    const statusLabel = { pending: 'Pending…', done: 'Done', error: 'Error' }[entry.status] ?? entry.status;
    const statusIcon  = {
      pending: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>`,
      done:    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>`,
      error:   `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>`,
    }[entry.status] ?? '';

    card.innerHTML = `
      <div class="hist-card__thumb-wrap">
        <img class="hist-card__thumb" src="${entry.thumbUrl}" alt="${entry.fileName}" loading="lazy">
        <span class="hist-card__status-badge hist-card__status-badge--${entry.status}"
          aria-label="Status: ${statusLabel}">
          ${statusIcon}
        </span>
      </div>

      <div class="hist-card__body">
        <p class="hist-card__species">
          ${entry.status === 'done'
            ? entry.topSpecies || '—'
            : entry.status === 'error'
              ? (entry.errorMsg || 'Identification failed')
              : 'Analysing…'}
        </p>
        <p class="hist-card__filename" title="${entry.fileName}">${entry.fileName}</p>

        ${entry.status === 'done' ? `
        <div class="hist-card__conf-row" aria-label="Confidence ${pct}%">
          <div class="hist-card__conf-bar">
            <div class="hist-card__conf-fill" style="width:${pct}%"
              aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" role="progressbar"></div>
          </div>
          <span class="hist-card__conf-pct">${pct}%</span>
        </div>` : ''}

        <time class="hist-card__time" datetime="${time.toISOString()}" title="${dateStr}">
          ${timeStr} · ${dateStr}
        </time>
      </div>

      <button class="hist-card__remove" type="button"
        aria-label="Remove this record" title="Remove">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    card.querySelector('.hist-card__remove').addEventListener('click', () => {
      this._records = this._records.filter(r => r.id !== entry.id);
      card.remove();
      if (this._records.length === 0) {
        this._empty.hidden    = false;
        this._clearBtn.hidden = true;
      }
    });

    return card;
  }
}

customElements.define('isee-identify-history', ISeeIdentifyHistory);
