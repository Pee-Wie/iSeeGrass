<?php
/**
 * PUT /api/users/update?id={userId}
 *
 * Update a user's profile fields.
 * - Regular users can only update their own record (editable fields only).
 * - Admins can update any user and additionally set status / role.
 *
 * Request body (JSON):
 *   {
 *     "first_name":  "...",   // optional
 *     "last_name":   "...",
 *     "middle_name": "...",
 *     "email":       "...",
 *     "position":    "...",
 *     "institution": "...",
 *     "phone":       "...",
 *     "bio":         "...",
 *     "avatar_url":  "...",
 *     // admin-only:
 *     "status":      "active" | "inactive",
 *     "role":        "user"   | "admin"
 *   }
 *
 * Response 200:
 *   { "success": true, "data": { ...updated user... } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('PUT');

$targetId = (int) ($_GET['id'] ?? 0);
if ($targetId <= 0) {
    jsonError('Missing or invalid user id.', 400);
}

$isAdmin = ($currentUser['role'] === 'admin');

// Permission check
if (!$isAdmin && (int) $currentUser['id'] !== $targetId) {
    jsonError('Forbidden.', 403);
}

$body = getJsonBody();

// ── Allowed fields ────────────────────────────────────────────────────────────
$editableFields = [
    'first_name', 'last_name', 'middle_name', 'email',
    'position', 'institution', 'phone', 'bio', 'avatar_url',
];
$adminOnlyFields = ['status', 'role'];

$updateData = [];

foreach ($editableFields as $field) {
    if (array_key_exists($field, $body)) {
        $updateData[$field] = $body[$field] === '' ? null : trim((string) $body[$field]);
    }
}

if ($isAdmin) {
    foreach ($adminOnlyFields as $field) {
        if (array_key_exists($field, $body)) {
            $updateData[$field] = trim((string) $body[$field]);
        }
    }
}

if (empty($updateData)) {
    jsonError('No updatable fields provided.', 422);
}

// ── Field-level validation ────────────────────────────────────────────────────
$errors = [];

if (isset($updateData['email']) && $updateData['email'] !== null) {
    if ($err = validateEmail($updateData['email'])) {
        $errors[] = $err;
    }
}
if (isset($updateData['position']) && $updateData['position'] !== null) {
    $allowedPositions = ['Researcher', 'Student', 'Class Instructor', 'Other'];
    if ($err = validateEnum($updateData['position'], $allowedPositions, 'Position')) {
        $errors[] = $err;
    }
}
if (isset($updateData['status'])) {
    if ($err = validateEnum($updateData['status'], ['active', 'inactive'], 'Status')) {
        $errors[] = $err;
    }
}
if (isset($updateData['role'])) {
    if ($err = validateEnum($updateData['role'], ['user', 'admin'], 'Role')) {
        $errors[] = $err;
    }
}

if ($errors) {
    jsonError(implode(' ', $errors), 422);
}

// ── Uniqueness check for email change ─────────────────────────────────────────
$pdo       = getDB();
$userModel = new UserModel($pdo);

if (!empty($updateData['email'])) {
    $existingEmail = $userModel->findByEmail(strtolower($updateData['email']));
    if ($existingEmail !== null && (int) $existingEmail['id'] !== $targetId) {
        jsonError('Email address is already in use by another account.', 409);
    }
    $updateData['email'] = strtolower($updateData['email']);
}

// ── Apply update ──────────────────────────────────────────────────────────────
$userModel->update($targetId, $updateData);

$updatedUser = $userModel->findById($targetId);
if ($updatedUser === null) {
    jsonError('User not found.', 404);
}

jsonSuccess(UserModel::sanitise($updatedUser));
