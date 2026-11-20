<?php
/**
 * POST /api/identifications/manual
 *
 * Save a manually-keyed result for an authenticated user. A request may
 * include an uploaded image, or reference a saved CNN identification.
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/IdentificationModel.php';
require_once __DIR__ . '/../../app/models/FlaggedPredictionModel.php';
require_once __DIR__ . '/../../helpers/identification_image_storage.php';

requireMethod('POST');

$allowedSpecies = [
    'Cymodocea rotundata',
    'Cymodocea serrulata',
    'Halodule uninervis',
    'Halophila minor',
    'Halophila ovalis',
    'Halophila spinulosa',
    'Halophila tricostata',
    'Syringodium isoetifolium',
    'Thalassia hemprichii',
    'Zostera capricorni',
];

$scientificName = trim((string) ($_POST['scientific_name'] ?? ''));
if (!in_array($scientificName, $allowedSpecies, true)) {
    jsonError('The selected species is not included in the manual key.', 422);
}

$title = isset($_POST['image_title'])
    ? substr(trim((string) $_POST['image_title']), 0, 120)
    : null;
if ($title === '') {
    $title = null;
}

$sourceIdentificationId = isset($_POST['source_identification_id'])
    ? (int) $_POST['source_identification_id']
    : null;
if ($sourceIdentificationId !== null && $sourceIdentificationId <= 0) {
    jsonError('Invalid source identification.', 422);
}

$source = null;
$imageFilename = null;
$imagePath = null;
$mimeType = null;
$extension = null;

if ($sourceIdentificationId !== null) {
    $pdo = getDB();
    $identificationModel = new IdentificationModel($pdo);
    $source = $identificationModel->findById($sourceIdentificationId);

    if ($source === null) {
        jsonError('Source identification was not found.', 404);
    }
    if ((int) $source['user_id'] !== (int) $currentUser['id']) {
        jsonError('You do not own the source identification.', 403);
    }
    if (($source['identification_method'] ?? 'cnn') !== 'cnn') {
        jsonError('Only a CNN identification can be corrected from the flag flow.', 422);
    }
    if (empty($source['image_path'])) {
        jsonError('The source identification has no saved image. Select the photo and use the main manual-key button.', 422);
    }

    $imageFilename = $source['image_filename'] ?? null;
    $imagePath = basename((string) $source['image_path']);
} else {
    if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        jsonError('A selected image is required.', 422);
    }

    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo->file($_FILES['image']['tmp_name']);
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($extensions[$mimeType])) {
        jsonError('Only JPEG, PNG, and WebP images are accepted.', 422);
    }

    $extension = $extensions[$mimeType];
    $rawFilename = trim((string) ($_POST['image_filename'] ?? $_FILES['image']['name'] ?? ''));
    $imageFilename = $rawFilename !== '' ? substr($rawFilename, 0, 255) : null;
}

$pdo = $pdo ?? getDB();
$model = new IdentificationModel($pdo);
$flagModel = new FlaggedPredictionModel($pdo);
$flagId = null;
$createdImage = false;

try {
    if ($source !== null) {
        $sourceImage = IdentificationImageStorage::findExisting($imagePath);
        if ($sourceImage === null) {
            jsonError('The source image is no longer available on the server.', 410);
        }

        $persistentPath = IdentificationImageStorage::path($imagePath);
        if ($sourceImage !== $persistentPath && !is_file($persistentPath)) {
            if (!copy($sourceImage, $persistentPath)) {
                throw new RuntimeException('Could not copy the source image to persistent storage.');
            }
            $createdImage = true;
        }
    } else {
        $imagePath = IdentificationImageStorage::storeUploaded($_FILES['image'], $extension);
        $createdImage = true;
    }

    if ($source !== null && $flagModel->alreadyFlagged(
        $sourceIdentificationId,
        (int) $currentUser['id']
    )) {
        if ($createdImage) {
            $storedPath = IdentificationImageStorage::path($imagePath);
            if (is_file($storedPath)) {
                unlink($storedPath);
            }
        }
        jsonError('You have already flagged this identification.', 409);
    }

    $pdo->beginTransaction();
    try {
        $identificationId = $model->create(
            (int) $currentUser['id'],
            1,
            $imageFilename,
            $title ?? ($source['title'] ?? null),
            $scientificName,
            null,
            null,
            $imagePath,
            'manual_key'
        );

        $speciesId = strtolower(str_replace(' ', '-', $scientificName));
        $model->addResult($identificationId, $speciesId, $scientificName, null, null, 1);

        if ($source !== null) {
            $flagId = $flagModel->create([
                'identification_id' => $sourceIdentificationId,
                'user_id' => (int) $currentUser['id'],
                'image_filename' => $source['image_filename'] ?? null,
                'model_prediction' => (string) ($source['top_result'] ?? 'Unknown'),
                'model_confidence' => $source['top_confidence'] !== null
                    ? (float) $source['top_confidence']
                    : null,
                'user_correction' => $scientificName,
                'notes' => isset($_POST['notes'])
                    ? substr(trim((string) $_POST['notes']), 0, 1000)
                    : null,
            ]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
} catch (Throwable $e) {
    if ($createdImage && $imagePath !== null) {
        try {
            $storedPath = IdentificationImageStorage::path($imagePath);
            if (is_file($storedPath)) {
                unlink($storedPath);
            }
        } catch (Throwable $storageError) {
            error_log('Manual identification image cleanup failed: ' . $storageError->getMessage());
        }
    }
    error_log('Manual identification save failed: ' . $e->getMessage());
    jsonError('Could not save the manual identification. Please try again.', 500);
}

jsonSuccess([
    'identification_id' => $identificationId,
    'image_url' => IdentificationImageStorage::imageUrl($imagePath),
    'model_type' => null,
    'identification_method' => 'manual_key',
    'top_result' => $scientificName,
    'top_confidence' => null,
    'scores' => [],
    'title' => $title ?? ($source['title'] ?? null),
    'flag_id' => $flagId,
]);
