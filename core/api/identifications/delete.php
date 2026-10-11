<?php
/**
 * DELETE /api/identifications/delete?id={n}  — admin only
 */
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../app/models/IdentificationModel.php';

setCorsHeaders();
requireMethod('DELETE');

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) jsonError('Missing or invalid id.', 400);

$pdo   = getDB();
$model = new IdentificationModel($pdo);
$ok    = $model->delete($id, (int)$currentUser['id']);
if (!$ok) jsonError('Record not found or not yours.', 404);

jsonSuccess(['message' => 'Identification deleted.']);
