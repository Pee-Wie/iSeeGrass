class ISeeFooterAid extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;
    this.dataset.ready = 'true';

    this.innerHTML = `
      <footer class="aid-footer">
        <div class="aid-footer__inner">
          <p class="aid-footer__disclaimer">
            iSeeGrass can make mistakes. Species identification results are provided for 
            reference only — always verify observations with a qualified marine biologist 
            or authoritative field guide before drawing scientific conclusions.
          </p>
          <p class="aid-footer__meta">
            &copy; ${new Date().getFullYear()} iSeeGrass &nbsp;&middot;&nbsp; 
            <a href="#">Privacy</a> &nbsp;&middot;&nbsp; 
            <a href="#">Terms</a> &nbsp;&middot;&nbsp; 
            <a href="#">Contact</a>
          </p>
        </div>
      </footer>

      <style>
        .aid-footer {
          margin-top: 3rem;
          padding: 1.25rem 1rem 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
        }

        .aid-footer__inner {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .aid-footer__disclaimer {
          margin: 0;
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.45);
          line-height: 1.65;
        }

        .aid-footer__meta {
          margin: 0;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.3);
        }

        .aid-footer__meta a {
          color: rgba(255, 255, 255, 0.4);
          text-decoration: none;
          transition: color 160ms ease;
        }

        .aid-footer__meta a:hover {
          color: rgba(124, 203, 77, 0.85);
        }
      </style>
    `;
  }
}

customElements.define('isee-footer-aid', ISeeFooterAid);
