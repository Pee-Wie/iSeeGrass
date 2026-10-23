<?php
// GET /api/assessments/show?id=
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('GET');

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) jsonError('Missing or invalid assessment id.', 400);

$pdo  = getDB();
$row  = (new AssessmentModel($pdo))->findById($id);
if (!$row) jsonError('Assessment not found.', 404);
if ($currentUser['role'] !== 'admin' && (int)$row['user_id'] !== (int)$currentUser['id']) jsonError('Forbidden.', 403);

jsonSuccess($row);
