/**
 * Admin Homepage — loads platform-wide stats into the 2×2 stat grid.
 */

(async function () {
  try {
    const res  = await fetch('/api/admin/stats', { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;

    const d = json.data;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '—';
    };

    set('stat-users',           d.total_users);
    set('stat-assessments',     d.total_assessments);
    set('stat-identifications', d.total_identifications);
    set('stat-species',         d.total_species);

    // Show flagged count badge if there are pending flags
    if (d.flagged_pending > 0) {
      const badge = document.createElement('div');
      badge.style.cssText =
        'margin-top:0.6rem;padding:0.4rem 0.75rem;background:rgba(224,82,82,0.12);' +
        'border:1px solid rgba(224,82,82,0.3);border-radius:6px;font-size:0.78rem;color:#e07070;';
      badge.innerHTML =
        `<i class="ti ti-flag" style="margin-right:0.35em;"></i>` +
        `<strong>${d.flagged_pending}</strong> flagged prediction${d.flagged_pending !== 1 ? 's' : ''} pending review`;
      const hero = document.querySelector('.home-hero__stats');
      if (hero) hero.after(badge);
    }

  } catch {
    // Stats are non-critical — fail silently
  }
})();
