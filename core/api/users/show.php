<?php
// GET /api/users/show?id=  — own record or any (admin)
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('GET');

$targetId = (int)($_GET['id'] ?? 0);
if ($targetId <= 0) jsonError('Missing or invalid user id.', 400);
if ($currentUser['role'] !== 'admin' && (int)$currentUser['id'] !== $targetId) jsonError('Forbidden.', 403);

$pdo       = getDB();
$userModel = new UserModel($pdo);
$user      = $userModel->findById($targetId);
if ($user === null) jsonError('User not found.', 404);

jsonSuccess(UserModel::sanitise($user));
