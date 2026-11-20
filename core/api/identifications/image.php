<?php
/**
 * GET /api/identifications/image?filename=<generated image filename>
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/identification_image_storage.php';

requireMethod('GET');

$filename = (string) ($_GET['filename'] ?? '');
try {
    $path = IdentificationImageStorage::findExisting($filename);
} catch (InvalidArgumentException $e) {
    jsonError('Invalid image filename.', 400);
} catch (RuntimeException $e) {
    jsonError('Persistent identification image storage is unavailable.', 503);
}

if ($path === null) {
    jsonError('Image not found.', 404);
}

$mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($path);
if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    jsonError('Stored file is not a supported image.', 415);
}

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . (string) filesize($path));
header('Content-Disposition: inline; filename="' . $filename . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=86400');
readfile($path);
exit;
