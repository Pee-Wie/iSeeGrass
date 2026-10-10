<?php
/**
 * POST /api/users/change_password?id={userId}
 *
 * Change a user's password.
 * - A user can change their own password (must provide current_password).
 * - An admin can reset any user's password without providing current_password.
 *
 * Request body (JSON):
 *   {
 *     "current_password": "oldpass",   // required for non-admin self-change
 *     "new_password":     "newpass123" // required; min 8 chars
 *   }
 *
 * Response 200:
 *   { "success": true, "data": { "message": "Password updated." } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('POST');

$targetId = (int) ($_GET['id'] ?? 0);
if ($targetId <= 0) {
    jsonError('Missing or invalid user id.', 400);
}

$isAdmin     = ($currentUser['role'] === 'admin');
$isSelf      = ((int) $currentUser['id'] === $targetId);

if (!$isAdmin && !$isSelf) {
    jsonError('Forbidden.', 403);
}

$body        = getJsonBody();
$newPassword = (string) ($body['new_password'] ?? '');

if ($err = validatePassword($newPassword)) {
    jsonError($err, 422);
}

$pdo       = getDB();
$userModel = new UserModel($pdo);
$targetUser = $userModel->findById($targetId);

if ($targetUser === null) {
    jsonError('User not found.', 404);
}

// Non-admin must verify their current password
if (!$isAdmin) {
    $currentPassword = (string) ($body['current_password'] ?? '');
    if ($currentPassword === '') {
        jsonError('Current password is required.', 422);
    }
    if (!verifyPassword($currentPassword, $targetUser['password_hash'])) {
        jsonError('Current password is incorrect.', 401);
    }
}

$userModel->updatePassword($targetId, hashPassword($newPassword));

jsonSuccess(['message' => 'Password updated successfully.']);
