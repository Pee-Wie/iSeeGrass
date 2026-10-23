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
              <button class="hist-sidebar__delete-all-btn" id="histDeleteAllBtn" type="button"
                aria-label="Delete all history from database" title="Delete all (permanent)" hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <button class="hist-sidebar__clear-btn" id="histClearBtn" type="button"
                aria-label="Clear all history" title="Clear history (session only)" hidden>
                <!-- Eraser icon — visually distinct from the trash/delete button -->
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/>
                  <path d="M6.0001 10.0001L14 18"/>
                </svg>
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
          <p class="hist-sidebar__session-note">Last 50 identifications · newest first</p>

          <!-- Record list -->
          <div class="hist-sidebar__list" id="histList" aria-live="polite" aria-label="History records">
            <div class="hist-empty" id="histEmpty">
              <!-- Default: no history yet -->
              <span class="hist-empty__state hist-empty__state--default">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="1.25"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p>No identifications yet.<br>Run the model to see results here.</p>
              </span>
              <!-- Offline: can't load history -->
              <span class="hist-empty__state hist-empty__state--offline" hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="1.25"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                  <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
                  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                  <line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
                <p>You're offline.<br>History will load when you reconnect.</p>
              </span>
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
    this._deleteAllBtn  = this.querySelector('#histDeleteAllBtn');
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
    this._deleteAllBtn.addEventListener('click', () => this._deleteAll());

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Expose on window so script-users-identify.js can call push/clear
    window.identifyHistory = this;

    // Show the right empty-state message based on current connectivity,
    // and update it whenever the connection status changes.
    // Start with 'default' — _loadHistory() will flip to 'offline' if
    // the server is unreachable (covers WiFi-with-no-internet on Android).
    this._setEmptyState('default');
    this._onlineHandler  = () => { this._setEmptyState('default'); this._loadHistory(); };
    this._offlineHandler = () => {
      // Only switch to the offline message when the list is actually empty
      if (this._records.length === 0) this._setEmptyState('offline');
    };
    window.addEventListener('online',  this._onlineHandler);
    window.addEventListener('offline', this._offlineHandler);

    // Load persistent history from the server (admin users only)
    this._loadHistory();
  }

  // ── Empty state ───────────────────────────────────────────────────

  /**
   * Switch between the two empty-state messages inside #histEmpty.
   * @param {'default' | 'offline'} state
   */
  _setEmptyState(state) {
    const defEl = this._empty?.querySelector('.hist-empty__state--default');
    const offEl = this._empty?.querySelector('.hist-empty__state--offline');
    if (!defEl || !offEl) return;
    defEl.hidden = state !== 'default';
    offEl.hidden = state !== 'offline';
  }

  // ── Persistent history ────────────────────────────────────────────

  /**
   * Fetch persisted identification history from the API and populate the
   * sidebar with DB records. Called once on component mount and again after
   * a queued job drains successfully (so cross-session results appear without
   * a manual page refresh).
   *
   * Merges with any existing in-memory records: DB records already rendered
   * (keyed as "db-{id}") are refreshed in-place; new records are prepended.
   * Silently no-ops on network/auth errors (guests, non-admin users).
   */
  async _loadHistory() {
    try {
      let data;
      if (window.ISEE_ADMIN_IDENTIFY) {
        const { listIdentificationHistory } = await import('../public/js/api/identify.api.js');
        data = await listIdentificationHistory({ limit: 50 });
      } else {
        const { listUserIdentificationHistory } = await import('../public/js/api/identify.api.js');
        data = await listUserIdentificationHistory({ limit: 50 });
      }
      const records = data?.records ?? [];

      for (const rec of records) {
        const stableId = `db-${rec.id}`;
        const existing = this._records.find(r => r.id === stableId);

        if (existing) {
          // Refresh the card in place — e.g. title may have changed
          Object.assign(existing, {
            topSpecies: rec.top_result    ?? '—',
            confidence: rec.top_confidence ?? 0,
            title:      rec.title ?? null,
            status:     'done',
          });
          this._refreshCard(stableId);
        } else {
          // New record not yet in memory — insert it
          this._pushPersisted(rec);
        }
      }

      if (records.length > 0) {
        this._clearBtn.hidden     = false;
        this._deleteAllBtn.hidden = false;
        this._empty.hidden        = true;
      }
    } catch (err) {
      // Show the offline message whenever the API call fails due to any
      // network-level issue — including when navigator.onLine is true but
      // the server is actually unreachable (e.g. WiFi with no internet,
      // which is common on Android).
      // For genuine auth errors (401 redirected away) we never reach here.
      // For any other non-network server error, also show offline state when
      // the list is empty so the user gets useful feedback.
      const msg = (err?.message || '').toLowerCase();
      const isNetworkFailure =
        !navigator.onLine ||
        msg.includes('network error') ||
        msg.includes('failed to fetch') ||
        msg.includes('load failed') ||
        msg.includes('offline') ||
        msg.includes('err_internet') ||
        msg.includes('err_network') ||
        (err instanceof TypeError);  // fetch() throws TypeError on connection failure

      if (this._records.length === 0) {
        this._setEmptyState(isNetworkFailure ? 'offline' : 'default');
      }
    }
  }

  /**
   * Insert a history card sourced from a DB record (no live thumbnail).
   * Uses the DB row `id` as `_seq` so the number is stable across reloads.
   *
   * @param {{ id:number, image_filename:string|null, top_result:string|null,
   *           top_confidence:number|null, created_at:string }} rec
   */
  _pushPersisted(rec) {
    const entry = {
      id:         `db-${rec.id}`,          // unique string id for data-id attr
      dbId:       rec.id,                  // numeric DB id used as _seq
      _seq:       rec.id,                  // display number (#42, etc.)
      timestamp:  rec.created_at
                    ? new Date(rec.created_at).getTime()
                    : Date.now(),
      fileName:   rec.image_filename ?? '(unknown)',
      thumbUrl:   null,                    // no thumbnail for persisted records
      topSpecies: rec.top_result    ?? '—',
      confidence: rec.top_confidence ?? 0,
      title:      rec.title ?? null,
      status:     'done',
      errorMsg:   null,
    };

    this._records.push(entry);             // push to end (already newest-first from API)
    this._renderRecord(entry);
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
    if (entry.dbId != null) {
      entry._seq = entry.dbId;           // use DB id for stable numbering
    } else {
      this._counter = (this._counter || 0) + 1;
      entry._seq = this._counter;        // sequential run number (session-scoped)
    }
    this._records.unshift(entry);        // newest first
    this._renderRecord(entry);
    this._clearBtn.hidden = false;
    this._deleteAllBtn.hidden = false;
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
    if (patch.dbId != null) {
      rec._seq = patch.dbId;             // switch to stable DB id once known
    }
    this._refreshCard(id);
  }

  // ── Clear ─────────────────────────────────────────────────────────

  clear() {
    this._records = [];
    this._counter = 0;
    // Remove all cards but keep the empty state element
    this._list.querySelectorAll('.hist-card').forEach(el => el.remove());
    this._empty.hidden    = false;
    this._clearBtn.hidden = true;
    this._deleteAllBtn.hidden = true;
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /**
   * Hard-delete ALL persisted identification records for the current user,
   * then clear the in-memory list from view.
   */
  async _deleteAll() {
    const count = this._records.length;
    if (count === 0) return;

    const persisted = this._records.filter(r => r.dbId).length;
    const msg = persisted > 0
      ? `Permanently delete all ${persisted} identification record${persisted !== 1 ? 's' : ''} from the database?\n\nThis cannot be undone. Records cleared from view only (session entries) will not be affected.`
      : `Clear ${count} session record${count !== 1 ? 's' : ''} from view?`;

    const ok = await window.modalConfirm(msg, 'Delete All History', 'Delete All');
    if (!ok) return;

    this._deleteAllBtn.disabled = true;

    try {
      if (persisted > 0) {
        const fnName = window.ISEE_ADMIN_IDENTIFY
          ? 'deleteAllIdentifications'
          : 'deleteAllUserIdentifications';
        const { [fnName]: deleteFn } = await import('../public/js/api/identify.api.js');
        await deleteFn();
      }
      this.clear();
    } catch (err) {
      console.error('[ID History] bulk delete failed:', err);
      this._deleteAllBtn.disabled = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /**
   * Truncate a filename to at most 10 visible base chars, then "..", then extension.
   * e.g. "img-123456789.jpg" → "img-123456..jpg"
   *      "short.png"         → "short.png"   (no truncation needed)
   * @param {string} fileName
   * @returns {string}
   */
  _truncateName(fileName) {
    const dotIdx = fileName.lastIndexOf('.');
    const base   = dotIdx !== -1 ? fileName.slice(0, dotIdx) : fileName;
    const ext    = dotIdx !== -1 ? fileName.slice(dotIdx)    : '';   // includes the dot
    if (base.length <= 10) return fileName;
    return `${base.slice(0, 10)}..${ext.replace(/^\./, '')}`;
  }

  // ── Render helpers ────────────────────────────────────────────────

  _renderRecord(entry) {
    const card = this._buildCard(entry);
    // Insert at the very top so new/in-progress records always appear first
    this._list.prepend(card);
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
    const statusLabel = { pending: 'Pending…', done: 'Done', error: 'Error', queued: 'Queued' }[entry.status] ?? entry.status;
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
      queued:  `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="1" y1="6" x2="23" y2="6"/>
                  <line x1="1" y1="12" x2="23" y2="12"/>
                  <line x1="1" y1="18" x2="23" y2="18"/>
                </svg>`,
    }[entry.status] ?? '';

    const shortName = this._truncateName(entry.fileName);
    const species   = entry.status === 'done'
      ? (entry.topSpecies || '—')
      : entry.status === 'error'
        ? (entry.errorMsg || 'Identification failed')
        : entry.status === 'queued'
          ? 'Queued — will retry when online'
          : 'Analysing…';

    const thumbHtml = entry.thumbUrl
      ? `<img class="hist-card__thumb" src="${entry.thumbUrl}" alt="${entry.fileName}" loading="lazy">`
      : `<div class="hist-card__thumb hist-card__thumb--placeholder" aria-hidden="true"></div>`;

    // Queued cards get a retry button instead of remove/delete.
    // Done cards show the standard remove + delete buttons.
    const isQueued = entry.status === 'queued';

    const actionButtons = isQueued ? `
      <button class="hist-card__retry" type="button"
        aria-label="Retry this identification now" title="Retry now">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>` : `
      <button class="hist-card__remove" type="button"
        aria-label="Remove this record" title="Remove">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <button class="hist-card__delete" type="button"
        aria-label="Delete this identification" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>`;

    card.innerHTML = `
      <div class="hist-card__thumb-wrap">
        ${thumbHtml}
        <span class="hist-card__status-badge hist-card__status-badge--${entry.status}"
          aria-label="Status: ${statusLabel}">
          ${statusIcon}
        </span>
      </div>

      <div class="hist-card__body${entry.status === 'done' ? ' hist-card__body--clickable' : ''}"
        ${entry.status === 'done' ? 'role="button" tabindex="0" title="Click to reload this result"' : ''}>

        <!-- Title row — click to rename (done only) -->
        <p class="hist-card__title" data-field="title">
          ${entry.title
            ? entry.title
            : '<em class="hist-card__title--empty">Untitled</em>'}
        </p>

        <!-- Meta row: #seq · filename · species -->
        <p class="hist-card__meta" title="${entry.fileName} — ${species}">
          <span class="hist-card__seq">#${entry._seq}</span>
          <span class="hist-card__meta-sep" aria-hidden="true">·</span>
          <span class="hist-card__filename">${shortName}</span>
          <span class="hist-card__meta-sep" aria-hidden="true">·</span>
          <span class="hist-card__species">${species}</span>
        </p>

        ${entry.status === 'done' ? `
        <div class="hist-card__conf-row" aria-label="Confidence ${pct}%">
          <div class="hist-card__conf-bar">
            <div class="hist-card__conf-fill" style="width:${pct}%"
              aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
              role="progressbar"></div>
          </div>
          <span class="hist-card__conf-pct">${pct}%</span>
        </div>` : ''}

        <time class="hist-card__time" datetime="${time.toISOString()}" title="${dateStr}">
          ${timeStr} · ${dateStr}
        </time>
      </div>

      ${actionButtons}
    `;

    // ── Retry button (queued cards only) ──────────────────────────
    const retryBtn = card.querySelector('.hist-card__retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Dispatch event to the identify page script which owns tryDrainQueue
        document.dispatchEvent(new CustomEvent('isee:retry-queue'));
      });
    }

    // ── In-session remove (hide only) — done/error/pending cards ──
    const removeBtn = card.querySelector('.hist-card__remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this._records = this._records.filter(r => r.id !== entry.id);
        card.remove();
        if (this._records.length === 0) {
          this._empty.hidden       = false;
          this._clearBtn.hidden    = true;
          this._deleteAllBtn.hidden = true;
        }
      });
    }

    // ── Trash (hard DB delete) ─────────────────────────────────────
    const deleteBtn = card.querySelector('.hist-card__delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!entry.dbId) {
          this._records = this._records.filter(r => r.id !== entry.id);
          card.remove();
          if (this._records.length === 0) {
            this._empty.hidden       = false;
            this._clearBtn.hidden    = true;
            this._deleteAllBtn.hidden = true;
          }
          return;
        }
        deleteBtn.disabled = true;
        try {
          if (window.ISEE_ADMIN_IDENTIFY) {
            const { deleteIdentification } = await import('../public/js/api/identify.api.js');
            await deleteIdentification(entry.dbId);
          } else {
            const { deleteUserIdentification } = await import('../public/js/api/identify.api.js');
            await deleteUserIdentification(entry.dbId);
          }
          this._records = this._records.filter(r => r.id !== entry.id);
          card.remove();
          if (this._records.length === 0) {
            this._empty.hidden       = false;
            this._clearBtn.hidden    = true;
            this._deleteAllBtn.hidden = true;
          }
        } catch {
          deleteBtn.disabled = false;
          card.classList.add('hist-card--delete-error');
          setTimeout(() => card.classList.remove('hist-card--delete-error'), 1000);
        }
      });
    }

    // ── Done card body click → reload result into left panel ───────
    const bodyEl = card.querySelector('.hist-card__body--clickable');
    if (bodyEl) {
      const activateLoad = (e) => {
        // Don't trigger when clicking inside the rename field
        if (e.target.closest('[data-field="title"]')) return;
        document.dispatchEvent(new CustomEvent('isee:load-hist-result', { detail: { entry } }));
      };
      bodyEl.addEventListener('click', activateLoad);
      bodyEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateLoad(e); }
      });
    }

    // ── Inline title rename ────────────────────────────────────────
    card.querySelector('[data-field="title"]').addEventListener('click', () => this._startRename(entry, card));

    return card;
  }

  _startRename(entry, card) {
    const titleEl = card.querySelector('[data-field="title"]');
    if (!titleEl || titleEl.tagName === 'INPUT') return; // already editing
    const input = document.createElement('input');
    input.className = 'hist-card__title-input';
    input.type = 'text';
    input.value = entry.title || '';
    input.maxLength = 120;
    input.placeholder = 'Untitled';
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = async () => {
      const newTitle = input.value.trim() || null;
      entry.title = newTitle;
      const newTitleEl = document.createElement('p');
      newTitleEl.className = 'hist-card__title';
      newTitleEl.dataset.field = 'title';
      newTitleEl.innerHTML = newTitle
        ? newTitle
        : '<em class="hist-card__title--empty">Untitled</em>';
      newTitleEl.addEventListener('click', () => this._startRename(entry, card));
      input.replaceWith(newTitleEl);
      if (entry.dbId) {
        try {
          if (window.ISEE_ADMIN_IDENTIFY) {
            const { updateIdentificationTitle } = await import('../public/js/api/identify.api.js');
            await updateIdentificationTitle(entry.dbId, newTitle);
          } else {
            const { updateUserIdentificationTitle } = await import('../public/js/api/identify.api.js');
            await updateUserIdentificationTitle(entry.dbId, newTitle);
          }
        } catch { /* silently ignore */ }
      }
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = entry.title || ''; input.blur(); }
    });
  }
}

customElements.define('isee-identify-history', ISeeIdentifyHistory);
