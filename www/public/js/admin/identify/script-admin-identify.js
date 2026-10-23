/**
 * Admin Identify — page-specific flag.
 *
 * Setting window.ISEE_ADMIN_IDENTIFY = true BEFORE script-users-identify.js
 * loads tells the shared identify script to render full result cards including
 * confidence bar graphs, which are exclusive to admin.
 *
 * Load order in identify.html (admin):
 *   1. script-admin-identify.js   ← sets the flag  (this file, loaded as plain <script>)
 *   2. script-users-identify.js   ← reads the flag (loaded as type="module")
 *
 * Note: this file is loaded as a plain <script> (not module) so the global
 * assignment executes synchronously before the module loads.
 */

window.ISEE_ADMIN_IDENTIFY = true;
