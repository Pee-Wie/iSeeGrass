class ISeeNavbar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') {
      return;
    }

    this.dataset.ready = 'true';

    this.innerHTML = `
      <aside class="site-sidebar">
        <div class="sidebar-brand">iSeeGrass</div>
        <nav class="sidebar-nav" aria-label="Sidebar navigation">
        </nav>
      </aside>
    `;
  }
}

customElements.define('isee-navbar-admin', ISeeNavbar);
