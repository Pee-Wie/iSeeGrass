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
        <nav class="site-footer__links" aria-label="Project and legal links">
          <a href="https://github.com/Pee-Wie/iSeeGrass" target="_blank" rel="noopener noreferrer">Main GitHub repository</a>
          <a href="/public/privacy.html">Privacy Notice</a>
          <a href="/public/terms.html">Terms and Conditions</a>
          <a href="/public/cookies.html">Cookie Policy</a>
        </nav>
      </footer>
    `;
  }
}

customElements.define('isee-wp-site-footer', ISeeFooter);
