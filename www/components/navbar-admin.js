class ISeeNavbar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;
    this.dataset.ready = 'true';

    const path = window.location.pathname;

    const links = [
      { href: '/views/admin/index.html',      label: 'Home',        icon: 'ti-home',             title: 'Go to admin home'                        },
      { href: '/views/admin/dashboard.html',  label: 'Dashboard',   icon: 'ti-layout-dashboard', title: 'Platform overview & analytics'           },
      { href: '/views/admin/users.html',      label: 'Users',       icon: 'ti-users',            title: 'Manage user accounts'                    },
      { href: '/views/admin/assessment.html', label: 'Assessments', icon: 'ti-clipboard-list',   title: 'View field assessments'                  },
      { href: '/views/admin/identify.html',   label: 'Identify',    icon: 'ti-microscope',       title: 'Run species identification'              },
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
            <a href="/views/admin/index.html" class="isee-navbar__brand-link">
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

  async _loadUserProfile() {
    try {
      const { get } = await import('../public/js/api/client.js');
      const user = await get('/auth/me');
      const avatarSlot = this.querySelector('.isee-user-btn__avatar');
      const labelSlot  = this.querySelector('.isee-user-btn__label');
      if (!avatarSlot) return;

      if (user.avatar_url) {
        avatarSlot.innerHTML = `<img src="${user.avatar_url}" alt="${user.first_name || 'User'}" class="isee-user-btn__avatar-img">`;
      } else {
        const initials = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || '?';
        avatarSlot.innerHTML = `<span class="isee-user-btn__initials">${initials}</span>`;
      }

      if (labelSlot && user.first_name) {
        labelSlot.textContent = user.first_name;
      }
    } catch {
      // Silently ignore — static fallback stays in place
    }
  }
}

customElements.define('isee-navbar-admin', ISeeNavbar);
