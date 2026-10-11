<?php
/**
 * PUT /api/identifications/user-update-title  — auth only
 * Body (JSON): { "id": 42, "title": "Reef survey 3" }
 */
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';   // <-- auth only
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../app/models/IdentificationModel.php';

setCorsHeaders();
requireMethod('PUT');

$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$id    = (int)($body['id'] ?? 0);
$title = isset($body['title']) ? substr(trim((string)$body['title']), 0, 120) : null;
if ($title === '') $title = null;

if ($id <= 0) jsonError('Missing or invalid id.', 400);

$pdo   = getDB();
$model = new IdentificationModel($pdo);
$ok    = $model->updateTitle($id, (int)$currentUser['id'], $title);
if (!$ok) jsonError('Record not found or not yours.', 404);

jsonSuccess(['id' => $id, 'title' => $title]);
