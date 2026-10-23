<?php
/**
 * GET  /api/settings/engine   — return the active CNN engine track
 * POST /api/settings/engine   — update the active CNN engine track (admin only)
 *
 * GET response:
 *   { "success": true, "data": { "engine_track": "improved_original" } }
 *
 * POST body (JSON):
 *   { "engine_track": "6_species_proto" }
 *
 * POST response:
 *   { "success": true, "data": { "engine_track": "6_species_proto" } }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../app/models/SessionModel.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('GET', 'POST');

const ALLOWED_TRACKS = ['original', 'improved_original', '6_species_proto'];
const SETTINGS_KEY   = 'cnn_engine_track';
const DEFAULT_TRACK  = 'improved_original';

$pdo = getDB();

// ── GET — public read (no auth required) ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $track = readTrack($pdo);
    jsonSuccess(['engine_track' => $track]);
}

// ── POST — admin only ─────────────────────────────────────────────────────────
$token = getSessionTokenFromCookie();
if ($token === null) {
    jsonError('Authentication required.', 401);
}

$sessionModel = new SessionModel($pdo);
$session      = $sessionModel->find($token);
if ($session === null) {
    jsonError('Session not found or expired.', 401);
}

$userModel = new UserModel($pdo);
$user      = $userModel->findById((int) $session['user_id']);
if (!$user || $user['role'] !== 'admin' || $user['status'] !== 'active') {
    jsonError('Admin access required.', 403);
}

// Parse and validate body
$body  = getJsonBody();
$track = trim((string) ($body['engine_track'] ?? ''));

if (!in_array($track, ALLOWED_TRACKS, true)) {
    jsonError(
        'Invalid engine track. Must be one of: ' . implode(', ', ALLOWED_TRACKS),
        422
    );
}

// Upsert the setting
$stmt = $pdo->prepare(
    'INSERT INTO system_settings (`key`, `value`)
     VALUES (:k, :v)
     ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)'
);
$stmt->execute([':k' => SETTINGS_KEY, ':v' => $track]);

jsonSuccess(['engine_track' => $track]);

// ── Helper ────────────────────────────────────────────────────────────────────
function readTrack(PDO $pdo): string {
    $stmt = $pdo->prepare(
        'SELECT `value` FROM system_settings WHERE `key` = :k LIMIT 1'
    );
    $stmt->execute([':k' => SETTINGS_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return ($row && in_array($row['value'], ALLOWED_TRACKS, true))
        ? $row['value']
        : DEFAULT_TRACK;
}
