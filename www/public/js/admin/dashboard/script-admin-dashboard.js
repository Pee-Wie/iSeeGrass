/**
 * Admin Dashboard — loads platform-wide stats and recent activity.
 */

(async function () {
  try {
    const res  = await fetch('/api/admin/stats', { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;

    const d = json.data;

    // ── Stat counters (dashboard has same IDs as homepage) ───────────────────
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '—';
    };

    set('stat-users',           d.total_users);
    set('stat-assessments',     d.total_assessments);
    set('stat-identifications', d.total_identifications);
    set('stat-species',         d.total_species);

    // ── Recent Activity list ─────────────────────────────────────────────────
    const list = document.getElementById('activity-list');
    if (!list) return;

    const items = d.recent_activity ?? [];

    if (items.length === 0) {
      list.innerHTML = '<li style="color:var(--muted);font-size:0.83rem;">No activity yet.</li>';
      return;
    }

    list.innerHTML = items.map(item => {
      const isBackground = /background substrate/i.test(item.top_result ?? '');
      const species = isBackground ? 'No seagrass detected' : (item.top_result ?? 'Unknown');
      const conf    = item.top_confidence != null
        ? `${parseFloat(item.top_confidence).toFixed(1)}%`
        : '';
      const user    = item.username
        ? `<span style="color:var(--accent);font-weight:600;">@${item.username}</span>`
        : '<span style="color:var(--muted);">Guest</span>';
      const date    = item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-PH',
            { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

      return `
        <li style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <i class="ti ti-${isBackground ? 'alert-triangle' : 'plant-2'}"
            style="font-size:1rem;margin-top:2px;flex-shrink:0;color:${isBackground ? '#e0b060' : 'var(--accent)'}"></i>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.82rem;color:var(--text);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${species}${conf ? ` <span style="color:var(--muted);font-weight:400;">(${conf})</span>` : ''}
            </div>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:1px;">
              ${user} &nbsp;·&nbsp; ${date}
            </div>
          </div>
        </li>`;
    }).join('');

  } catch {
    const list = document.getElementById('activity-list');
    if (list) list.innerHTML =
      '<li style="color:var(--muted);font-size:0.83rem;">Could not load activity.</li>';
  }
})();
