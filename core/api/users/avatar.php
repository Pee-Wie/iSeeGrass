<?php
/**
 * POST   /api/users/avatar  — upload a new profile picture
 * DELETE /api/users/avatar  — remove the current profile picture
 *
 * Saves uploaded images to www/public/uploads/avatars/<user_id>.<ext>
 * and updates users.avatar_url to the public path.
 *
 * Size limit : 2 MB
 * MIME types : image/jpeg, image/png, image/webp, image/gif
 * Auth       : session cookie (require_auth)
 */
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();

$method   = $_SERVER['REQUEST_METHOD'];
$userId   = (int) $currentUser['id'];

// ── Upload directory (absolute, resolved relative to this file) ──────────────
$uploadDir = realpath(__DIR__ . '/../../../www/public/uploads/avatars');
if ($uploadDir === false) {
    // Directory does not exist — try to create it
    $uploadDir = __DIR__ . '/../../../www/public/uploads/avatars';
    if (!mkdir($uploadDir, 0755, true)) {
        jsonError('Avatar upload directory could not be created.', 500);
    }
    $uploadDir = realpath($uploadDir);
}
$uploadDir = rtrim($uploadDir, '/\\') . '/';

// ── Helper: delete all existing avatar files for this user ───────────────────
function deleteExistingAvatars(string $dir, int $uid): void
{
    foreach (glob($dir . $uid . '.*') ?: [] as $file) {
        @unlink($file);
    }
}

// ── POST — upload new avatar ──────────────────────────────────────────────────
if ($method === 'POST') {

    // Check file present and upload succeeded
    if (empty($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        $uploadError = $_FILES['avatar']['error'] ?? -1;
        $messages = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit.',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds form size limit.',
            UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
            UPLOAD_ERR_NO_FILE    => 'No avatar file was submitted.',
            UPLOAD_ERR_NO_TMP_DIR => 'Server temporary directory is missing.',
            UPLOAD_ERR_CANT_WRITE => 'Server could not write the uploaded file.',
        ];
        jsonError($messages[$uploadError] ?? 'File upload failed.', 400);
    }

    // Validate file size (2 MB hard limit)
    $maxBytes = 2 * 1024 * 1024;
    if ($_FILES['avatar']['size'] > $maxBytes) {
        jsonError('File too large. Maximum size is 2MB.', 413);
    }

    // Validate MIME type from file content — never trust $_FILES[]['type']
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($_FILES['avatar']['tmp_name']);

    $allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($mimeType, $allowedMime, true)) {
        jsonError('Only JPEG, PNG, WebP, and GIF images are accepted.', 400);
    }

    // Derive extension from MIME type
    $ext = match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    };

    // Delete any previous avatar files for this user
    deleteExistingAvatars($uploadDir, $userId);

    $filename    = $userId . '.' . $ext;
    $destination = $uploadDir . $filename;

    if (!move_uploaded_file($_FILES['avatar']['tmp_name'], $destination)) {
        jsonError('Failed to save avatar. Check server write permissions.', 500);
    }

    $publicUrl = '/public/uploads/avatars/' . $filename;

    // Persist the URL to the database
    $pdo       = getDB();
    $userModel = new UserModel($pdo);
    $userModel->update($userId, ['avatar_url' => $publicUrl]);

    jsonSuccess(['avatar_url' => $publicUrl]);
}

// ── DELETE — remove avatar ────────────────────────────────────────────────────
if ($method === 'DELETE') {

    deleteExistingAvatars($uploadDir, $userId);

    $pdo       = getDB();
    $userModel = new UserModel($pdo);
    $userModel->update($userId, ['avatar_url' => null]);

    jsonSuccess([]);
}

// ── Any other method ──────────────────────────────────────────────────────────
http_response_code(405);
header('Allow: POST, DELETE');
echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
