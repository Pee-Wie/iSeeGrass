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
$model = new AssessmentModel($pdo);
$row  = $model->findById($id);
if (!$row) jsonError('Assessment not found.', 404);
if (!AssessmentModel::canView($row, $currentUser)) jsonError('Forbidden.', 403);
$row['viewer_group'] = AssessmentModel::viewerGroup($row, $currentUser);
$row['can_delete'] = AssessmentModel::canDelete($row, $currentUser);
$row['can_edit'] = AssessmentModel::canEdit($row, $currentUser);

jsonSuccess($row);
