<?php
/**
 * PUT /api/assessments/update?id={assessmentId}
 *
 * Update an existing assessment.
 * Users can only update their own; admins can update any.
 *
 * Request body (JSON):
 *   {
 *     "title":   "Updated Title",     // optional
 *     "content": "<p>New HTML</p>",   // optional
 *     "status":  "in_progress"        // optional; draft | in_progress | finalized
 *   }
 *
 * Response 200:
 *   { "success": true, "data": { ...updated assessment... } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('PUT');

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    jsonError('Missing or invalid assessment id.', 400);
}

$pdo             = getDB();
$assessmentModel = new AssessmentModel($pdo);
$existing        = $assessmentModel->findById($id);

if ($existing === null) {
    jsonError('Assessment not found.', 404);
}

$isAdmin = ($currentUser['role'] === 'admin');

if (!$isAdmin && (int) $existing['user_id'] !== (int) $currentUser['id']) {
    jsonError('Forbidden.', 403);
}

$body       = getJsonBody();
$updateData = [];

if (array_key_exists('title', $body)) {
    $title = trim((string) $body['title']);
    if ($title === '') {
        jsonError('Title cannot be empty.', 422);
    }
    $updateData['title'] = $title;
}

if (array_key_exists('content', $body)) {
    $updateData['content'] = $body['content'];  // allow null / empty string
}

if (array_key_exists('status', $body)) {
    $allowedStatuses = ['draft', 'in_progress', 'finalized'];
    if ($err = validateEnum(trim((string) $body['status']), $allowedStatuses, 'Status')) {
        jsonError($err, 422);
    }
    $updateData['status'] = trim((string) $body['status']);
}

if (empty($updateData)) {
    jsonError('No updatable fields provided.', 422);
}

// Pass owner check only for non-admin so the model enforces it at DB level too
$ownerUserId = $isAdmin ? null : (int) $currentUser['id'];
$assessmentModel->update($id, $updateData, $ownerUserId);

$updated = $assessmentModel->findById($id);
jsonSuccess($updated);
