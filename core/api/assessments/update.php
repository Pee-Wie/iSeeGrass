<?php
// PUT /api/assessments/update?id=
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('PUT');

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) jsonError('Missing or invalid assessment id.', 400);

$pdo      = getDB();
$model    = new AssessmentModel($pdo);
$existing = $model->findById($id);
if (!$existing) jsonError('Assessment not found.', 404);

$isAdmin = ($currentUser['role'] === 'admin');
if (!$isAdmin && (int)$existing['user_id'] !== (int)$currentUser['id']) jsonError('Forbidden.', 403);

$body       = getJsonBody();
$updateData = [];
if (array_key_exists('title',   $body)) {
    $t = trim((string)$body['title']);
    if (!$t) jsonError('Title cannot be empty.', 422);
    if ($model->titleExistsForUser((int)$currentUser['id'], $t, $id)) {
        jsonError('An assessment with this title already exists.', 409);
    }
    $updateData['title'] = $t;
}
if (array_key_exists('content', $body)) $updateData['content'] = $body['content'];
if (array_key_exists('status',  $body)) {
    if ($e = validateEnum(trim((string)$body['status']), ['draft','in_progress','finalized'], 'Status')) jsonError($e, 422);
    $updateData['status'] = trim((string)$body['status']);
}
if (empty($updateData)) jsonError('No updatable fields provided.', 422);

$model->update($id, $updateData, $isAdmin ? null : (int)$currentUser['id']);
jsonSuccess($model->findById($id));
