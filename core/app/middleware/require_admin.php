<?php
/**
 * core/app/middleware/require_admin.php
 *
 * Include this at the top of any API file that requires admin role.
 * It chains require_auth.php internally, so you only need one include.
 *
 * On success:  $currentUser (array) is available and role === 'admin'
 * On failure:  sends 401 or 403 JSON and exits
 *
 * Usage:
 *   require_once __DIR__ . '/../../app/middleware/require_admin.php';
 *   // $currentUser is admin-verified
 */

require_once __DIR__ . '/require_auth.php';   // sets $currentUser or exits

// require_auth already verified the user is active and has a valid session.
// Now check the role.
if (($currentUser['role'] ?? '') !== 'admin') {
    jsonError('Forbidden — admin access required.', 403);
}
