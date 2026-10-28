<?php
/**
 * POST /api/identifications/flag
 *
 * Stores a user-submitted "wrong prediction" flag for a given identification run.
 * Auth is optional — logged-in users get their user_id stored; guests are allowed.
 * Each (identification_id, user_id) pair can only be flagged once.
 *
 * Request body (JSON):
 *   {
 *     "identification_id": 42,          // int|null — null for guest runs
 *     "model_prediction":  "Halodule pinifolia",
 *     "model_confidence":  87.5,         // float|null
 *     "user_correction":   "Cymodocea rotundata",  // string|null — optional
 *     "notes":             "Image was blurry"       // string|null — optional
 *   }
 *
 * Response 200:
 *   { "success": true, "data": { "flag_id": 7 } }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../app/models/SessionModel.php';
require_once __DIR__ . '/../../app/models/UserModel.php';
require_once __DIR__ . '/../../app/models/IdentificationModel.php';
require_once __DIR__ . '/../../app/models/FlaggedPredictionModel.php';

setCorsHeaders();
requireMethod('POST');

// ── Optional auth — resolve user if session cookie present ───────────────────
$currentUser = null;
$token       = getSessionTokenFromCookie();

if ($token !== null) {
    $pdo          = getDB();
    $sessionModel = new SessionModel($pdo);
    $session      = $sessionModel->find($token);
    if ($session !== null) {
        $userModel = new UserModel($pdo);
        $row       = $userModel->findById((int) $session['user_id']);
        if ($row && $row['status'] === 'active') {
            $currentUser = UserModel::sanitise($row);
        }
    }
}

$pdo = $pdo ?? getDB();

// ── Parse body ───────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) jsonError('Invalid JSON body.', 400);

$identificationId = isset($body['identification_id'])
    ? (int) $body['identification_id']
    : null;

$modelPrediction = trim((string) ($body['model_prediction'] ?? ''));
if ($modelPrediction === '') jsonError('model_prediction is required.', 422);

$modelConfidence = isset($body['model_confidence'])
    ? (float) $body['model_confidence']
    : null;

$userCorrection = isset($body['user_correction'])
    ? substr(trim((string) $body['user_correction']), 0, 120)
    : null;
if ($userCorrection === '') $userCorrection = null;

$notes = isset($body['notes'])
    ? substr(trim((string) $body['notes']), 0, 1000)
    : null;
if ($notes === '') $notes = null;

// ── Validate identification_id ownership ────────────────────────────────────
$imageFilename = null;

if ($identificationId !== null && $identificationId > 0) {
    $identModel = new IdentificationModel($pdo);
    $ident      = $identModel->findById($identificationId);

    if ($ident === null) {
        jsonError('Identification not found.', 404);
    }

    // Logged-in users: must own the identification
    if ($currentUser !== null && (int) $ident['user_id'] !== (int) $currentUser['id']) {
        jsonError('You do not own this identification.', 403);
    }

    $imageFilename = $ident['image_filename'] ?? null;
}

// ── Duplicate check ──────────────────────────────────────────────────────────
$flagModel = new FlaggedPredictionModel($pdo);
$userId    = $currentUser !== null ? (int) $currentUser['id'] : null;

if ($identificationId !== null && $flagModel->alreadyFlagged($identificationId, $userId)) {
    jsonError('You have already flagged this identification.', 409);
}

// ── Store flag ───────────────────────────────────────────────────────────────
$flagId = $flagModel->create([
    'identification_id' => $identificationId ?: null,
    'user_id'           => $userId,
    'image_filename'    => $imageFilename,
    'model_prediction'  => $modelPrediction,
    'model_confidence'  => $modelConfidence,
    'user_correction'   => $userCorrection,
    'notes'             => $notes,
]);

jsonSuccess(['flag_id' => $flagId]);
