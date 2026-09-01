class ISeeSidebar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') {
      return;
    }

    this.dataset.ready = 'true';

    this.innerHTML = `
      <aside class="site-sidebar">
        <div class="sidebar-brand">iSeeGrass</div>
        <nav class="sidebar-nav" aria-label="Sidebar navigation">
          <a href="../index.html">Overview</a>
          <a href="../public/about.html">About</a>
          <a href="../public/contacts.html">Contact</a>
          <a href="../views/users/dashboard.html">Dashboard</a>
        </nav>
      </aside>
    `;
  }
}

customElements.define('isee-sidebar', ISeeSidebar);
