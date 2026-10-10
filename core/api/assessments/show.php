<?php
/**
 * GET /api/assessments/show?id={assessmentId}
 *
 * Returns a single assessment including its content.
 * Users can only view their own; admins can view any.
 *
 * Response 200:
 *   { "success": true, "data": { ...assessment + user info... } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('GET');

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    jsonError('Missing or invalid assessment id.', 400);
}

$pdo             = getDB();
$assessmentModel = new AssessmentModel($pdo);
$assessment      = $assessmentModel->findById($id);

if ($assessment === null) {
    jsonError('Assessment not found.', 404);
}

// Ownership check
if ($currentUser['role'] !== 'admin' && (int) $assessment['user_id'] !== (int) $currentUser['id']) {
    jsonError('Forbidden.', 403);
}

jsonSuccess($assessment);
