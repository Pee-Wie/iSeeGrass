<?php
// POST /api/assessments/create
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('POST');

$body   = getJsonBody();
$errors = requireFields($body, ['title']);
if ($errors) jsonError(implode(' ', $errors), 422);

$title   = trim((string)($body['title']   ?? ''));
$content = $body['content'] ?? null;
$status  = trim((string)($body['status']  ?? 'draft'));

if ($e = validateEnum($status, ['draft','in_progress','finalized'], 'Status')) jsonError($e, 422);

$pdo   = getDB();
$model = new AssessmentModel($pdo);

if ($model->titleExistsForUser((int)$currentUser['id'], $title)) {
    jsonError('An assessment with this title already exists.', 409);
}

$newId = $model->create((int)$currentUser['id'], $title, $content, $status);

jsonSuccess($model->findById($newId), 201);
