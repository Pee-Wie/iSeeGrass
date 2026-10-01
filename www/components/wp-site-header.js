import './wp-site-navbar.js';

class ISeeHeader extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') {
      return;
    }

    this.dataset.ready = 'true';

    this.innerHTML = `
      <header class="site-header">
        <div class="brand">
        <img src="/../../public/icons/favicon.png" width="110" height="32" alt="Tabler" class="navbar-brand-image" />iSeeGrass
        </div>
        <isee-navbar></isee-navbar>
      </header>
    `;
  }
}

customElements.define('isee-header', ISeeHeader);
