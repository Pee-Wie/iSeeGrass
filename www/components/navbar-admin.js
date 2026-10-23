class ISeeNavbar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;
    this.dataset.ready = 'true';

    const path = window.location.pathname;

    const links = [
      { href: '/views/admin/index.html',      label: 'Home',        icon: 'ti-home',             title: 'Go to admin home'                        },
      { href: '/views/admin/dashboard.html',  label: 'Dashboard',   icon: 'ti-layout-dashboard', title: 'Platform overview & analytics'           },
      { href: '/views/admin/identify.html',   label: 'Identify',    icon: 'ti-microscope',       title: 'Run species identification'              },
      { href: '/views/admin/assessment.html', label: 'Assessments', icon: 'ti-clipboard-list',   title: 'View field assessments'                  },
      { href: '/views/admin/users.html',      label: 'Users',       icon: 'ti-users',            title: 'Manage user accounts'                    },
      { href: '/views/admin/report.html',     label: 'Operations',  icon: 'ti-chart-bar',        title: 'Reports, catalog & model settings'       },
    ];

    const navItems = links.map(({ href, label, icon, title }) => {
      const isActive = path.endsWith(href) || path === href;
      return `
        <li class="nav-item">
          <a class="nav-link isee-nav-link${isActive ? ' active' : ''}" href="${href}" title="${title}">
            <span class="isee-nav-link__icon"><i class="ti ${icon}"></i></span>
            <span class="isee-nav-link__label">${label}</span>
          </a>
        </li>`;
    }).join('');

    this.innerHTML = `
      <nav class="navbar navbar-vertical navbar-expand-sm position-absolute user-navigation isee-navbar"
        data-bs-theme="dark" aria-label="Admin navigation">
        <div class="container-fluid">

          <!-- Mobile toggler -->
          <button class="navbar-toggler isee-navbar__toggler" type="button"
            aria-label="Toggle navigation" aria-expanded="false">
            <i class="ti ti-menu-2 isee-toggler-icon isee-toggler-icon--open"></i>
            <i class="ti ti-x    isee-toggler-icon isee-toggler-icon--close" style="display:none"></i>
          </button>

          <!-- Brand -->
          <div class="isee-navbar__brand">
            <a href="/views/admin/identify.html" class="isee-navbar__brand-link">
              <img src="/public/icons/favicon.png" width="28" height="28" alt="iSeeGrass logo"
                class="isee-navbar__brand-img">
              <span class="isee-navbar__brand-name">iSeeGrass</span>
            </a>
          </div>

          <!-- Nav links -->
          <div class="collapse navbar-collapse" id="sidebar-menu">
            <ul class="navbar-nav user-navigation-links isee-navbar__links pt-lg-3">
              ${navItems}
            </ul>
          </div>

          <!-- Footer — user menu -->
          <div class="isee-navbar__footer">

            <!-- Pop-up menu (hidden by default) -->
            <div class="isee-user-menu" id="iseeUserMenu" hidden>
              <a href="/views/admin/index.html" class="isee-user-menu__item">
                <i class="ti ti-user-circle"></i>
                <span>Admin Home</span>
              </a>
              <a href="/views/auth/login.html" class="isee-user-menu__item isee-user-menu__item--danger">
                <i class="ti ti-logout"></i>
                <span>Log out</span>
              </a>
            </div>

            <!-- Trigger button -->
            <button class="isee-user-btn" id="iseeUserBtn" type="button"
              aria-haspopup="true" aria-expanded="false" aria-controls="iseeUserMenu"
              title="Account">
              <span class="isee-user-btn__avatar">
                <i class="ti ti-user"></i>
              </span>
              <span class="isee-user-btn__label">Account</span>
              <i class="ti ti-chevron-up isee-user-btn__chevron"></i>
            </button>

          </div>

        </div>
      </nav>
    `;

    // Wire logout link — call the API to invalidate the server session and
    // clear localStorage before navigating to the login page.
    // When offline, block the logout entirely.
    const logoutLink = this.querySelector('.isee-user-menu__item--danger');
    if (logoutLink) {
      logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!navigator.onLine) {
          this._showOfflineToast('Can\'t log out while offline. Please reconnect first.');
          return;
        }

        try {
          const { logout } = await import('../public/js/api/auth.api.js');
          await logout();
        } catch {
          // Network may be unavailable — proceed anyway; the cookie will
          // expire on its own and the server will reject it next time.
        } finally {
          localStorage.removeItem('isee_user');
          localStorage.removeItem('isee_own_login_at');
          window.location.href = '/views/auth/login.html';
        }
      });
    }

    // Toggle the pop-up menu
    const btn  = this.querySelector('#iseeUserBtn');
    const menu = this.querySelector('#iseeUserMenu');

    btn.addEventListener('click', () => {
      const open = !menu.hidden;
      menu.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
      btn.classList.toggle('is-open', !open);
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('is-open');
      }
    });

    // Mobile nav toggler — show/hide the vertical link list
    const toggler  = this.querySelector('.isee-navbar__toggler');
    const collapse = this.querySelector('#sidebar-menu');
    const iconOpen  = toggler.querySelector('.isee-toggler-icon--open');
    const iconClose = toggler.querySelector('.isee-toggler-icon--close');

    toggler.addEventListener('click', () => {
      const expanded = collapse.classList.toggle('show');
      toggler.setAttribute('aria-expanded', String(expanded));
      iconOpen.style.display  = expanded ? 'none' : '';
      iconClose.style.display = expanded ? ''     : 'none';
    });

    // Load current user avatar + name
    this._loadUserProfile();
  }

  /**
   * Show a small non-blocking toast at the bottom of the screen.
   * Used for offline-action blocked messages.
   */
  _showOfflineToast(message) {
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.style.cssText = [
      'position:fixed',
      'bottom:1.75rem',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(60,60,60,0.95)',
      'color:#ffffff',
      'padding:0.65rem 1.4rem',
      'border-radius:999px',
      'font-size:0.88rem',
      'font-weight:600',
      'z-index:2147483647',
      'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
      'pointer-events:none',
      'white-space:nowrap',
      'opacity:0',
      'transition:opacity 200ms ease',
      'max-width:90vw',
      'text-align:center',
    ].join(';');
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
    setTimeout(() => {
      el.style.opacity = '0';
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 3500);
  }

  async _loadUserProfile() {
    // ── Step 1: paint from localStorage immediately ───────────────────────────
    try {
      const raw = localStorage.getItem('isee_user');
      if (raw) {
        const cached = JSON.parse(raw);
        this._applyUserToNavbar(cached);
      }
    } catch (_) { /* corrupt cache — ignore */ }

    // ── Step 2: refresh from API silently (noRedirect — never force login) ───
    try {
      const { get } = await import('../public/js/api/client.js');
      const user = await get('/auth/me', { noRedirect: true });
      this._applyUserToNavbar(user);
      try {
        const cached = JSON.parse(localStorage.getItem('isee_user') || '{}');
        localStorage.setItem('isee_user', JSON.stringify({ ...cached, ...user }));
      } catch (_) { /* ignore */ }
    } catch {
      // Silently ignore — localStorage fallback already painted.
    }
  }

  _applyUserToNavbar(user) {
    const avatarSlot = this.querySelector('.isee-user-btn__avatar');
    const labelSlot  = this.querySelector('.isee-user-btn__label');
    if (!avatarSlot) return;

    avatarSlot.textContent = '';
    if (user.avatar_url) {
      const img = document.createElement('img');
      img.src       = user.avatar_url;
      img.alt       = user.first_name || 'User';
      img.className = 'isee-user-btn__avatar-img';
      avatarSlot.appendChild(img);
    } else {
      const initials = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || '?';
      const span = document.createElement('span');
      span.className   = 'isee-user-btn__initials';
      span.textContent = initials;
      avatarSlot.appendChild(span);
    }

    if (labelSlot && user.first_name) {
      labelSlot.textContent = user.first_name;
    }
  }
}

customElements.define('isee-navbar-admin', ISeeNavbar);
