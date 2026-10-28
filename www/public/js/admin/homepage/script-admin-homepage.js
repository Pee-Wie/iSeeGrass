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

    // Flagged count now shown in Operations → Platform Statistics tab

  } catch {
    // Stats are non-critical — fail silently
  }
})();
