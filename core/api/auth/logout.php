<?php
require_once __DIR__ . '/../../config/cors.php';
/**
 * POST /api/auth/logout
 *
 * Deletes the server-side session row and clears the cookie.
 * Always returns 200 (idempotent — calling it when already logged out is fine).
 *
 * Response 200:
 *   { "success": true, "data": { "message": "Logged out successfully." } }
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../app/models/SessionModel.php';

setCorsHeaders();
requireMethod('POST');

$token = getSessionTokenFromCookie();

if ($token !== null) {
    $pdo          = getDB();
    $sessionModel = new SessionModel($pdo);
    $sessionModel->delete($token);
}

clearSessionCookie();

jsonSuccess(['message' => 'Logged out successfully.']);
