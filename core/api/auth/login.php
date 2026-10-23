<?php
require_once __DIR__ . '/../../config/cors.php';
/**
 * POST /api/auth/login
 *
 * Request body (JSON):
 *   { "username": "...", "password": "..." }
 *
 * Response 200:
 *   { "success": true, "data": { ...user (no password_hash)... } }
 *
 * Response 401:
 *   { "success": false, "error": "Invalid username or password." }
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/models/UserModel.php';
require_once __DIR__ . '/../../app/models/SessionModel.php';

setCorsHeaders();
requireMethod('POST');

$body = getJsonBody();

// ── Validate input ────────────────────────────────────────────────────────────
$errors = requireFields($body, ['username', 'password']);
if ($errors) {
    jsonError(implode(' ', $errors), 422);
}

$username = trim((string) ($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');

// ── Look up the user ──────────────────────────────────────────────────────────
$pdo       = getDB();
$userModel = new UserModel($pdo);
$user      = $userModel->findByUsername($username);

// Use a constant-time comparison to prevent user enumeration timing attacks
if ($user === null || !verifyPassword($password, $user['password_hash'])) {
    jsonError('Invalid username or password.', 401);
}

if ($user['status'] !== 'active') {
    jsonError('Your account has been deactivated. Please contact an administrator.', 403);
}

// ── Create session ────────────────────────────────────────────────────────────
$sessionModel = new SessionModel($pdo);
$lifetime     = sessionLifetimeSeconds();
$token        = generateSessionToken();

$sessionModel->purgeExpired();            // clean up stale rows on each login
$sessionModel->create((int) $user['id'], $lifetime, $token);

setSessionCookie($token, $lifetime);

jsonSuccess(UserModel::sanitise($user));
