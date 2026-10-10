<?php
/**
 * DELETE /api/assessments/delete?id={assessmentId}
 *
 * Delete an assessment.
 * Users can delete their own draft/in_progress assessments.
 * Admins can delete any assessment at any status.
 *
 * Response 200:
 *   { "success": true, "data": { "message": "Assessment deleted." } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('DELETE');

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

$ownerUserId = $isAdmin ? null : (int) $currentUser['id'];
$assessmentModel->delete($id, $ownerUserId);

jsonSuccess(['message' => 'Assessment deleted successfully.']);
