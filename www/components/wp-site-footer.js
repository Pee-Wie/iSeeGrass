class ISeeFooter extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') {
      return;
    }

    this.dataset.ready = 'true';

    this.innerHTML = `
      <footer class="site-footer">
        <p>iSeeGrass: Web and Mobile Application for Seagrass Species Identification and Assessment Using Image Recognition.</p>
        <p>Designed to support marine research with intelligent, image-driven species recognition.</p>
      </footer>
    `;
  }
}

customElements.define('isee-wp-site-footer', ISeeFooter);
