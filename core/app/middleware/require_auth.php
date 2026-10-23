<?php
/**
 * core/app/middleware/require_auth.php
 *
 * Include this at the top of any API file that requires a logged-in user.
 *
 * On success:  $currentUser  (array) is set — the full user row (no password_hash)
 * On failure:  sends 401 JSON and exits
 *
 * Usage:
 *   require_once __DIR__ . '/../../app/middleware/require_auth.php';
 *   // $currentUser is now available
 */

// Avoid double-inclusion in files that chain require_auth → require_admin
if (defined('AUTH_MIDDLEWARE_LOADED')) {
    return;
}
define('AUTH_MIDDLEWARE_LOADED', true);

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';
require_once __DIR__ . '/../../app/models/SessionModel.php';

$_token = getSessionTokenFromCookie();

if ($_token === null) {
    jsonError('Authentication required.', 401);
}

$_pdo          = getDB();
$_sessionModel = new SessionModel($_pdo);
$_session      = $_sessionModel->find($_token);

if ($_session === null) {
    // Token missing or expired — clear the stale cookie
    clearSessionCookie();
    jsonError('Session expired or invalid. Please log in again.', 401);
}

$_userModel  = new UserModel($_pdo);
$_userRow    = $_userModel->findById((int) $_session['user_id']);

if ($_userRow === null || $_userRow['status'] !== 'active') {
    clearSessionCookie();
    jsonError('Your account is inactive or has been removed.', 401);
}

// Make the cleaned user available to the including file
$currentUser = UserModel::sanitise($_userRow);

// Clean up expired sessions opportunistically (1-in-20 chance to keep overhead low)
if (random_int(1, 20) === 1) {
    $_sessionModel->purgeExpired();
}

// Unset internal vars so they don't pollute the including file's scope
unset($_token, $_session, $_userRow);
