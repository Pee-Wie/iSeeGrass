import { getLinkConfig, applyActiveNavigation } from '../js/app.js';

class ISeeNavbar extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') {
      return;
    }

    this.dataset.ready = 'true';

    const links = getLinkConfig();

    this.innerHTML = `
      <nav class="nav-links" aria-label="Main navigation">
        ${links
          .map((link) => {
            const classAttr = link.className ? ` class="${link.className}"` : '';
            return `<a href="${link.href}"${classAttr}>${link.label}</a>`;
          })
          .join('')}
      </nav>
    `;

    applyActiveNavigation(this);
  }
}

customElements.define('isee-navbar', ISeeNavbar);
