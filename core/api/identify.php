<?php
/**
 * POST /api/identify
 *
 * Accepts a multipart image upload from the frontend, forwards it to the
 * CREYNet FastAPI server running on Google Colab (exposed via ngrok), then
 * returns the result as JSON and optionally persists it to the database.
 *
 * Architecture:
 *   Browser → POST /api/identify (this file, on XAMPP)
 *             → PHP forwards image + model_type to Colab FastAPI via cURL
 *             → Colab returns the multi-track JSON response
 *             → PHP normalises, saves to DB, returns full result
 *
 * Auth:
 *   - Logged-in users: identification is saved to the database.
 *   - Guests:          inference runs but nothing is saved.
 *
 * Config (.env):
 *   CNN_API_URL   — ngrok base URL, e.g. https://xxxx.ngrok-free.app
 *   CNN_TEMP_DIR  — local temp dir for uploaded files (default /tmp/iseegrass_uploads)
 *
 * Request:
 *   Content-Type: multipart/form-data
 *   image      (file,   required — JPEG / PNG / WebP)
 *   model_type (string, optional — 'original' | 'improved_original' | '6_species_proto')
 *              Defaults to 'improved_original'.
 *
 * Colab response (new multi-track format):
 *   {
 *     "status": "success",
 *     "active_engine_track": "improved_original",
 *     "verdict": {
 *       "class_id": 1,
 *       "species_name": "Halophila spinulosa",
 *       "confidence_percentage": 94.25
 *     },
 *     "all_probabilities": {
 *       "Background Substrate": 1.25,
 *       "Halophila spinulosa": 94.25,
 *       ...
 *     }
 *   }
 *
 * Response 200:
 *   {
 *     "success": true,
 *     "data": {
 *       "identification_id": 42,              // null for guests
 *       "model_type":        "improved_original",
 *       "top_result":        "Halophila spinulosa",
 *       "top_confidence":    94.25,           // percent
 *       "scores": [
 *         { "label": "Halophila spinulosa", "confidence": 94.25 },
 *         ...
 *       ]
 *     }
 *   }
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../app/models/SessionModel.php';
require_once __DIR__ . '/../app/models/UserModel.php';
require_once __DIR__ . '/../app/models/IdentificationModel.php';

requireMethod('POST');

// ── Allowed model_type values ─────────────────────────────────────────────────
const ALLOWED_MODEL_TYPES = ['original', 'improved_original', '6_species_proto'];

// ── Validate and sanitise model_type ──────────────────────────────────────────
$rawModelType = trim((string) ($_POST['model_type'] ?? 'improved_original'));
if (!in_array($rawModelType, ALLOWED_MODEL_TYPES, true)) {
    $rawModelType = 'improved_original';
}
$modelType = $rawModelType;

// ── Sanitise original filename ────────────────────────────────────────────────
$rawFilename   = trim((string) ($_POST['image_filename'] ?? $_FILES['image']['name'] ?? ''));
$imageFilename = $rawFilename !== '' ? substr($rawFilename, 0, 255) : null;

// ── Optional identification title ─────────────────────────────────────────────
$title = isset($_POST['image_title']) ? substr(trim($_POST['image_title']), 0, 120) : null;
if ($title === '') $title = null;

// ── Optional auth ─────────────────────────────────────────────────────────────
// If the caller explicitly identifies itself as a guest (Aid page), skip auth
// entirely so the run is never attributed to a lingering logged-in session.
$currentUser = null;
$isGuestCall = !empty($_POST['guest']) && $_POST['guest'] === '1';
$token       = $isGuestCall ? null : getSessionTokenFromCookie();

if ($token !== null) {
    $pdo          = getDB();
    $sessionModel = new SessionModel($pdo);
    $session      = $sessionModel->find($token);
    if ($session !== null) {
        $userModel = new UserModel($pdo);
        $userRow   = $userModel->findById((int) $session['user_id']);
        if ($userRow && $userRow['status'] === 'active') {
            $currentUser = UserModel::sanitise($userRow);
        }
    }
}

// ── File validation ───────────────────────────────────────────────────────────
if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $uploadError = $_FILES['image']['error'] ?? -1;
    $messages = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit.',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form size limit.',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No image file was submitted.',
        UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory is missing.',
        UPLOAD_ERR_CANT_WRITE => 'Server failed to write the uploaded file.',
    ];
    jsonError($messages[$uploadError] ?? 'File upload failed.', 422);
}

$finfo    = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($_FILES['image']['tmp_name']);
$allowed  = ['image/jpeg', 'image/png', 'image/webp'];

if (!in_array($mimeType, $allowed, true)) {
    jsonError('Only JPEG, PNG, and WebP images are accepted.', 422);
}

$ext = match ($mimeType) {
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
};

// ── Save to temp directory ────────────────────────────────────────────────────
$tempDir = env('CNN_TEMP_DIR', '/tmp/iseegrass_uploads');
if (!is_dir($tempDir) && !mkdir($tempDir, 0700, true)) {
    jsonError('Could not create temp directory on server.', 500);
}

$filename = 'iseeg_' . bin2hex(random_bytes(8)) . '.' . $ext;
$tempPath = $tempDir . '/' . $filename;

if (!move_uploaded_file($_FILES['image']['tmp_name'], $tempPath)) {
    jsonError('Failed to save uploaded image.', 500);
}

// ── Check CNN_API_URL is configured ──────────────────────────────────────────
$cnnapiUrl = rtrim((string) env('CNN_API_URL', ''), '/');

if (empty($cnnapiUrl) || str_contains($cnnapiUrl, 'replace-with-your-ngrok-url')) {
    @unlink($tempPath);
    jsonError(
        'CNN service is not configured. Set CNN_API_URL in .env to the current ngrok URL.',
        503
    );
}

// ── Forward image + model_type to Colab FastAPI via cURL ─────────────────────
$predictUrl = $cnnapiUrl . '/predict';

$ch = curl_init($predictUrl);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,           // Colab can be slow on cold start
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_POSTFIELDS     => [
        'file'       => new CURLFile($tempPath, $mimeType, basename($tempPath)),
        'model_type' => $modelType,
    ],
    // ngrok requires this header to bypass the browser-warning interstitial
    CURLOPT_HTTPHEADER     => ['ngrok-skip-browser-warning: true'],
    CURLOPT_SSL_VERIFYPEER => true,
]);

$rawResponse = curl_exec($ch);
$httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError   = curl_error($ch);
curl_close($ch);

// Clean up temp file regardless of outcome
@unlink($tempPath);

// ── Handle cURL / HTTP errors ─────────────────────────────────────────────────
if ($rawResponse === false || $curlError) {
    jsonError('Could not reach the CNN service. Check your ngrok URL and Colab session. (' . $curlError . ')', 503);
}

if ($httpCode === 422) {
    jsonError('CNN service rejected the image (invalid format or size).', 422);
}

if ($httpCode === 500) {
    $errBody = json_decode($rawResponse, true);
    $detail  = $errBody['detail'] ?? null;

    if ($detail === null && preg_match('/ValueError:\s*(.+)/i', $rawResponse, $m)) {
        $detail = trim($m[1]);
    }

    $msg = $detail
        ? "CNN inference error: {$detail}"
        : 'CNN service crashed (HTTP 500). Check the Colab output for details.';
    jsonError($msg, 502);
}

if ($httpCode !== 200) {
    jsonError("CNN service returned an unexpected status: HTTP {$httpCode}.", 502);
}

$colabResult = json_decode($rawResponse, true);

if ($colabResult === null) {
    $preview = strip_tags(substr($rawResponse, 0, 300));
    $preview = preg_replace('/\s+/', ' ', trim($preview));
    jsonError('CNN service returned invalid JSON. Raw: ' . $preview, 502);
}

// ── Validate Colab response structure ─────────────────────────────────────────
if (($colabResult['status'] ?? '') !== 'success') {
    $detail = $colabResult['detail'] ?? $colabResult['message'] ?? 'Unknown error from CNN service.';
    jsonError('CNN inference did not succeed: ' . $detail, 502);
}

// ── Parse the multi-track response ───────────────────────────────────────────
// active_engine_track: the track the model actually used (mirrors what we sent)
$activeTrack = (string) ($colabResult['active_engine_track'] ?? $modelType);

$verdict     = $colabResult['verdict']          ?? [];
$allProbs    = $colabResult['all_probabilities'] ?? [];

$topLabel      = (string) ($verdict['species_name']           ?? 'Unknown');
$topConfidence = (float)  ($verdict['confidence_percentage']  ?? 0.0);

// Build the scores array from the all_probabilities map.
// Sort descending for display consistency.
$scores = [];
foreach ($allProbs as $label => $percent) {
    $scores[] = [
        'label'      => (string) $label,
        'confidence' => round((float) $percent, 2),
    ];
}
usort($scores, fn($a, $b) => $b['confidence'] <=> $a['confidence']);

// ── Persist to DB for authenticated users ────────────────────────────────────
$identificationId = null;

if ($currentUser !== null) {
    $pdo   = $pdo ?? getDB();
    $model = new IdentificationModel($pdo);

    $identificationId = $model->create(
        (int) $currentUser['id'],
        1,                // image_count
        $imageFilename,   // original filename
        $title,           // optional run title
        $topLabel,
        $topConfidence,
        $activeTrack      // model_type — stored for history/reporting
    );

    $rank = 1;
    foreach ($scores as $score) {
        // Build a URL-safe slug from the label
        $speciesId = strtolower(preg_replace('/[\s\/()]+/', '-', $score['label']));
        $speciesId = preg_replace('/-+/', '-', trim($speciesId, '-'));

        $model->addResult(
            $identificationId,
            $speciesId,
            $score['label'],
            null,
            $score['confidence'],
            $rank
        );
        $rank++;
    }
}

// ── Return result ─────────────────────────────────────────────────────────────
jsonSuccess([
    'identification_id' => $identificationId,
    'model_type'        => $activeTrack,
    'top_result'        => $topLabel,
    'top_confidence'    => $topConfidence,
    'scores'            => $scores,
    'title'             => $title ?? null,
]);
