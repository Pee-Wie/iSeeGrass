<?php
/**
 * POST /api/auth/register
 *
 * Creates a new user account. The new account starts with role = 'user'.
 * Admin accounts can only be created by existing admins via the admin API.
 *
 * Request body (JSON):
 *   {
 *     "username":    "jmreyes",
 *     "email":       "jm@example.com",
 *     "password":    "securepass123",
 *     "first_name":  "Juan",
 *     "last_name":   "Reyes",
 *     "middle_name": "M",          // optional
 *     "position":    "Researcher", // Researcher | Student | Class Instructor | Other
 *     "institution": "MSU",        // optional
 *     "phone":       "+63...",     // optional
 *     "bio":         "..."         // optional
 *   }
 *
 * Response 201:
 *   { "success": true, "data": { ...user (no password_hash)... } }
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/models/UserModel.php';
require_once __DIR__ . '/../../app/models/SessionModel.php';

setCorsHeaders();
requireMethod('POST');

$body = getJsonBody();

// ── Required fields ───────────────────────────────────────────────────────────
$errors = requireFields($body, ['username', 'email', 'password', 'first_name', 'last_name', 'position']);
if ($errors) {
    jsonError(implode(' ', $errors), 422);
}

$username  = trim((string) ($body['username']  ?? ''));
$email     = strtolower(trim((string) ($body['email'] ?? '')));
$password  = (string) ($body['password']  ?? '');
$firstName = trim((string) ($body['first_name'] ?? ''));
$lastName  = trim((string) ($body['last_name']  ?? ''));
$position  = trim((string) ($body['position']   ?? 'Researcher'));

// ── Field validation ──────────────────────────────────────────────────────────
$validationErrors = [];

if ($err = validateUsername($username))  { $validationErrors[] = $err; }
if ($err = validateEmail($email))        { $validationErrors[] = $err; }
if ($err = validatePassword($password))  { $validationErrors[] = $err; }

$allowedPositions = ['Researcher', 'Student', 'Class Instructor', 'Other'];
if ($err = validateEnum($position, $allowedPositions, 'Position')) {
    $validationErrors[] = $err;
}

if ($validationErrors) {
    jsonError(implode(' ', $validationErrors), 422);
}

// ── Uniqueness checks ─────────────────────────────────────────────────────────
$pdo       = getDB();
$userModel = new UserModel($pdo);

if ($userModel->findByUsername($username) !== null) {
    jsonError('Username is already taken.', 409);
}
if ($userModel->findByEmail($email) !== null) {
    jsonError('Email address is already registered.', 409);
}

// ── Create the user ───────────────────────────────────────────────────────────
$newId = $userModel->create([
    'username'      => $username,
    'email'         => $email,
    'password_hash' => hashPassword($password),
    'first_name'    => $firstName,
    'last_name'     => $lastName,
    'middle_name'   => inputStr($body, 'middle_name'),
    'position'      => $position,
    'role'          => 'user',    // always user on self-registration
    'institution'   => inputStr($body, 'institution'),
    'phone'         => inputStr($body, 'phone'),
    'bio'           => inputStr($body, 'bio'),
]);

$newUser = $userModel->findById($newId);

// ── Auto-login: create a session ──────────────────────────────────────────────
$sessionModel = new SessionModel($pdo);
$lifetime     = sessionLifetimeSeconds();
$token        = generateSessionToken();
$sessionModel->create($newId, $lifetime, $token);
setSessionCookie($token, $lifetime);

jsonSuccess(UserModel::sanitise($newUser), 201);
