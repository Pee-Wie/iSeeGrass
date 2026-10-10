<?php
/**
 * GET /api/users/show?id={userId}
 *
 * Returns a single user record.
 * - Admins can fetch any user.
 * - Regular users can only fetch their own record.
 *
 * Response 200:
 *   { "success": true, "data": { ...user... } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('GET');

$targetId = (int) ($_GET['id'] ?? 0);
if ($targetId <= 0) {
    jsonError('Missing or invalid user id.', 400);
}

// Non-admin users may only view themselves
if ($currentUser['role'] !== 'admin' && $currentUser['id'] != $targetId) {
    jsonError('Forbidden.', 403);
}

$pdo       = getDB();
$userModel = new UserModel($pdo);
$user      = $userModel->findById($targetId);

if ($user === null) {
    jsonError('User not found.', 404);
}

jsonSuccess(UserModel::sanitise($user));
