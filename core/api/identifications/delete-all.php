<?php
/**
 * DELETE /api/identifications/delete-all  — admin only
 */
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../app/models/IdentificationModel.php';

setCorsHeaders();
requireMethod('DELETE');

$pdo   = getDB();
$model = new IdentificationModel($pdo);
$count = $model->deleteAllByUser((int)$currentUser['id']);

jsonSuccess(['message' => 'All identifications deleted.', 'deleted' => $count]);
