<?php
// DELETE /api/users/delete?id=  — admin only
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('DELETE');

$targetId = (int)($_GET['id'] ?? 0);
if ($targetId <= 0) jsonError('Missing or invalid user id.', 400);
if ((int)$currentUser['id'] === $targetId) jsonError('You cannot delete your own account.', 403);

$pdo       = getDB();
$userModel = new UserModel($pdo);
if ($userModel->findById($targetId) === null) jsonError('User not found.', 404);
$userModel->delete($targetId);

jsonSuccess(['message' => 'User deleted successfully.']);
