<?php
/**
 * POST /api/identify
 *
 * Accepts a multipart image upload, saves it to a secure temp directory,
 * calls the CREYNet Python inference script, returns the result as JSON,
 * and — for authenticated users — persists the identification to the database.
 *
 * Auth:
 *   - Logged-in users: identification run + results are saved to the DB.
 *   - Guest users (no session): inference is run but nothing is saved.
 *
 * Request:
 *   Content-Type: multipart/form-data
 *   Field:  image   (file, required)
 *
 * Response 200 (success):
 *   {
 *     "success": true,
 *     "data": {
 *       "identification_id": 42,    // null for guests
 *       "top_result":   "Halophila spinulosa",
 *       "top_confidence": 94.12,
 *       "scores": [
 *         { "index": 0, "label": "Background Substrate", "confidence": 1.23 },
 *         { "index": 1, "label": "Halophila spinulosa",  "confidence": 94.12 },
 *         { "index": 2, "label": "Cymodocea rotundata",  "confidence": 3.01 },
 *         { "index": 3, "label": "Halodule pinifolia",   "confidence": 1.64 }
 *       ]
 *     }
 *   }
 *
 * Response 422 — no file uploaded
 * Response 500 — Python script error
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../app/models/SessionModel.php';
require_once __DIR__ . '/../app/models/UserModel.php';
require_once __DIR__ . '/../app/models/IdentificationModel.php';

setCorsHeaders();
requireMethod('POST');

// ── Optional auth: identify user if session exists ────────────────────────────
$currentUser = null;
$token       = getSessionTokenFromCookie();

if ($token !== null) {
    $pdo          = getDB();
    $sessionModel = new SessionModel($pdo);
    $session      = $sessionModel->find($token);

    if ($session !== null) {
        $userModel   = new UserModel($pdo);
        $userRow     = $userModel->findById((int) $session['user_id']);
        if ($userRow && $userRow['status'] === 'active') {
            $currentUser = UserModel::sanitise($userRow);
        }
    }
}

// ── File validation ───────────────────────────────────────────────────────────
if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $uploadError = $_FILES['image']['error'] ?? -1;
    $messages    = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit.',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form upload limit.',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No image file was submitted.',
        UPLOAD_ERR_NO_TMP_DIR => 'Server temp directory is missing.',
        UPLOAD_ERR_CANT_WRITE => 'Server failed to write the uploaded file.',
        UPLOAD_ERR_EXTENSION  => 'Upload blocked by a PHP extension.',
    ];
    $msg = $messages[$uploadError] ?? 'File upload failed.';
    jsonError($msg, 422);
}

// Validate MIME type via finfo (do not trust $_FILES['type'])
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

if (!is_dir($tempDir)) {
    if (!mkdir($tempDir, 0700, true)) {
        jsonError('Server temp directory could not be created.', 500);
    }
}

$filename = 'iseeg_' . bin2hex(random_bytes(8)) . '.' . $ext;
$tempPath = $tempDir . '/' . $filename;

if (!move_uploaded_file($_FILES['image']['tmp_name'], $tempPath)) {
    jsonError('Failed to save uploaded image.', 500);
}

// ── Call Python inference script ──────────────────────────────────────────────
$pythonBin  = env('CNN_PYTHON_BIN',   '/home/codex/ml_env/bin/python');
$scriptPath = env('CNN_SCRIPT_PATH',  '/media/codex/Shared/iSeeGrass_CNN/predict_api.py');
$modelPath  = env('CNN_MODEL_PATH',   '/media/codex/Shared/iSeeGrass_CNN/CREYNet_v0.02.keras');

// Escape all args — never allow user-controlled values into shell
$cmd = sprintf(
    'TF_CPP_MIN_LOG_LEVEL=3 %s %s --image %s --model %s 2>/dev/null',
    escapeshellarg($pythonBin),
    escapeshellarg($scriptPath),
    escapeshellarg($tempPath),
    escapeshellarg($modelPath)
);

$output = shell_exec($cmd);

// Clean up the temp file regardless of outcome
@unlink($tempPath);

if ($output === null || trim($output) === '') {
    jsonError('CNN inference script produced no output. Check server configuration.', 500);
}

$result = json_decode(trim($output), true);

if ($result === null || !is_array($result)) {
    jsonError('CNN inference script returned invalid JSON.', 500);
}

if (!($result['success'] ?? false)) {
    $errMsg = $result['error'] ?? 'Unknown inference error.';
    jsonError("Inference failed: {$errMsg}", 500);
}

// ── Persist to DB for authenticated users ─────────────────────────────────────
$identificationId = null;

if ($currentUser !== null) {
    $pdo   = $pdo ?? getDB();
    $model = new IdentificationModel($pdo);

    $topLabel      = $result['predicted_class'] ?? null;
    $topConfidence = null;

    // Find top score percent from scores array
    if (!empty($result['scores']) && is_array($result['scores'])) {
        foreach ($result['scores'] as $score) {
            if (($score['label'] ?? '') === $topLabel) {
                $topConfidence = round((float) $score['confidence'] * 100, 2);
                break;
            }
        }
    }

    $identificationId = $model->create(
        (int) $currentUser['id'],
        1,               // image_count
        $topLabel,
        $topConfidence
    );

    // Save each candidate score as a result row (skip Background Substrate)
    $rank = 1;
    if (!empty($result['scores'])) {
        // Sort descending by confidence
        usort($result['scores'], fn($a, $b) => $b['confidence'] <=> $a['confidence']);

        foreach ($result['scores'] as $score) {
            $label      = $score['label']      ?? 'Unknown';
            $confidence = round((float) $score['confidence'] * 100, 2);

            // Convert label to a slug for species_id
            $speciesId = strtolower(preg_replace('/\s+/', '-', $label));

            $model->addResult(
                $identificationId,
                $speciesId,
                $label,
                null,           // common_name not available from CNN output
                $confidence,
                $rank
            );
            $rank++;
        }
    }
}

// ── Build response ────────────────────────────────────────────────────────────
$scores = [];
if (!empty($result['scores'])) {
    foreach ($result['scores'] as $score) {
        $scores[] = [
            'index'      => $score['index']      ?? null,
            'label'      => $score['label']      ?? 'Unknown',
            'confidence' => round((float) ($score['confidence'] ?? 0) * 100, 2),
        ];
    }
}

jsonSuccess([
    'identification_id' => $identificationId,
    'top_result'        => $result['predicted_class'] ?? null,
    'top_confidence'    => $identificationId !== null
                            ? (float) round((float) ($result['scores'][0]['confidence'] ?? 0) * 100, 2)
                            : null,
    'scores'            => $scores,
]);
