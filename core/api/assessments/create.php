<?php
/**
 * POST /api/assessments/create
 *
 * Create a new assessment owned by the currently authenticated user.
 *
 * Request body (JSON):
 *   {
 *     "title":   "My Assessment",
 *     "content": "<p>HTML content from editor</p>",  // optional
 *     "status":  "draft"  // optional; draft | in_progress | finalized (default: draft)
 *   }
 *
 * Response 201:
 *   { "success": true, "data": { ...assessment... } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('POST');

$body = getJsonBody();

$errors = requireFields($body, ['title']);
if ($errors) {
    jsonError(implode(' ', $errors), 422);
}

$title   = trim((string) ($body['title']   ?? ''));
$content = $body['content'] ?? null;
$status  = trim((string) ($body['status']  ?? 'draft'));

$allowedStatuses = ['draft', 'in_progress', 'finalized'];
if ($err = validateEnum($status, $allowedStatuses, 'Status')) {
    jsonError($err, 422);
}

$pdo             = getDB();
$assessmentModel = new AssessmentModel($pdo);
$newId           = $assessmentModel->create((int) $currentUser['id'], $title, $content, $status);
$assessment      = $assessmentModel->findById($newId);

jsonSuccess($assessment, 201);
