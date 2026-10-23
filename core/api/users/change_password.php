<?php
// POST /api/users/change_password?id=
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('POST');

$targetId = (int)($_GET['id'] ?? 0);
if ($targetId <= 0) jsonError('Missing or invalid user id.', 400);

$isAdmin = ($currentUser['role'] === 'admin');
$isSelf  = ((int)$currentUser['id'] === $targetId);
if (!$isAdmin && !$isSelf) jsonError('Forbidden.', 403);

$body        = getJsonBody();
$newPassword = (string)($body['new_password'] ?? '');
if ($e = validatePassword($newPassword)) jsonError($e, 422);

$pdo       = getDB();
$userModel = new UserModel($pdo);
$target    = $userModel->findById($targetId);
if (!$target) jsonError('User not found.', 404);

if (!$isAdmin) {
    $cur = (string)($body['current_password'] ?? '');
    if ($cur === '') jsonError('Current password is required.', 422);
    if (!verifyPassword($cur, $target['password_hash'])) jsonError('Current password is incorrect.', 401);
}

$userModel->updatePassword($targetId, hashPassword($newPassword));
jsonSuccess(['message' => 'Password updated successfully.']);
