<?php
// PUT /api/users/update?id=
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('PUT');

$targetId = (int)($_GET['id'] ?? 0);
if ($targetId <= 0) jsonError('Missing or invalid user id.', 400);

$isAdmin = ($currentUser['role'] === 'admin');
if (!$isAdmin && (int)$currentUser['id'] !== $targetId) jsonError('Forbidden.', 403);

$body = getJsonBody();

$editable     = ['first_name','last_name','middle_name','email','username','position','institution','phone','bio','avatar_url'];
$adminOnly    = ['status','role'];
$updateData   = [];

foreach ($editable as $f) {
    if (array_key_exists($f, $body)) $updateData[$f] = $body[$f] === '' ? null : trim((string)$body[$f]);
}
if ($isAdmin) {
    foreach ($adminOnly as $f) {
        if (array_key_exists($f, $body)) $updateData[$f] = trim((string)$body[$f]);
    }
}

if (empty($updateData)) jsonError('No updatable fields provided.', 422);

$ve = [];
if (isset($updateData['email'])    && $updateData['email']    && ($e = validateEmail($updateData['email'])))        $ve[] = $e;
if (isset($updateData['position']) && $updateData['position'] && ($e = validateEnum($updateData['position'], ['Researcher','Student','Class Instructor','Other','Admin'], 'Position'))) $ve[] = $e;
if (isset($updateData['status'])   && ($e = validateEnum($updateData['status'],   ['active','inactive'], 'Status'))) $ve[] = $e;
if (isset($updateData['role'])     && ($e = validateEnum($updateData['role'],     ['user','admin'],       'Role')))   $ve[] = $e;
if ($ve) jsonError(implode(' ', $ve), 422);

$pdo       = getDB();
$userModel = new UserModel($pdo);

if (!empty($updateData['email'])) {
    $updateData['email'] = strtolower($updateData['email']);
    $existing = $userModel->findByEmail($updateData['email']);
    if ($existing && (int)$existing['id'] !== $targetId) jsonError('Email already in use.', 409);
}

if (!empty($updateData['username'])) {
    $existing = $userModel->findByUsername($updateData['username']);
    if ($existing && (int)$existing['id'] !== $targetId) jsonError('Username already taken.', 409);
}

$userModel->update($targetId, $updateData);
$updated = $userModel->findById($targetId);
if (!$updated) jsonError('User not found.', 404);

jsonSuccess(UserModel::sanitise($updated));
