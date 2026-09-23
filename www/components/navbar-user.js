class ISeeNavbar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') {
      return;
    }

    this.dataset.ready = 'true';

    this.innerHTML = `
      <nav class="navbar navbar-vertical navbar-expand-sm position-absolute user-navigation" data-bs-theme="dark" aria-label="User navigation">
        <div class="container-fluid">
          <button class="navbar-toggler" type="button">
            <span class="navbar-toggler-icon"></span>
          </button>
          <h1 class="navbar-brand navbar-brand-autodark">
            <a href="/views/users/identify.html">
              <img src="/../../public/icons/favicon.png" width="110" height="32" alt="Tabler"
                class="navbar-brand-image" />iSeeGrass
            </a>
          </h1>
          <div class="collapse navbar-collapse" id="sidebar-menu">
            <ul class="navbar-nav user-navigation-links pt-lg-3">
              <li class="nav-item">
                <a class="nav-link" href="/views/users/">
                  <span class="nav-link-title"> Home </span>
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/views/users/dashboard.html">
                  <span class="nav-link-title"> Dashboard</span>
                </a>
              </li>
               <li class="nav-item">
                <a class="nav-link" href="/views/users/identify.html">
                  <span class="nav-link-title"> Identify</span>
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/views/users/editor.html">
                  <span class="nav-link-title"> Assessment</span>
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="/views/users/profile.html">
                  <span class="nav-link-title"> Profile</span>
                </a>
              </li>
            </ul>
          </div>
          <div class="nav-footer">
            <h1 class="navbar-brand navbar-brand-autodark">
              <a href="/views/users/identify.html">
                <img src="/../../public/icons/favicon.png" width="110" height="32" alt="i" class="navbar-brand-image" />iSeeGrass
                <a href="/views/auth/login.html">  -{]</a>
              </a>
            </h1>
          </div>
        </div>
      </nav>
    `;

    this.querySelector('.navbar-toggler').addEventListener('click', () => {
      this.querySelector('#sidebar-menu').classList.toggle('show');
    });
  }
}

customElements.define('isee-navbar-user', ISeeNavbar);
