<?php
// POST /api/users/create  — admin creates an account (can set role=admin)
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('POST');

$body   = getJsonBody();
$errors = requireFields($body, ['username','email','password','first_name','last_name','position']);
if ($errors) jsonError(implode(' ', $errors), 422);

$username  = trim((string)($body['username']  ?? ''));
$email     = strtolower(trim((string)($body['email'] ?? '')));
$password  = (string)($body['password']  ?? '');
$firstName = trim((string)($body['first_name'] ?? ''));
$lastName  = trim((string)($body['last_name']  ?? ''));
$position  = trim((string)($body['position']   ?? 'Researcher'));
$role      = trim((string)($body['role']       ?? 'user'));

$ve = [];
if ($e = validateUsername($username))  $ve[] = $e;
if ($e = validateEmail($email))        $ve[] = $e;
if ($e = validatePassword($password))  $ve[] = $e;
if ($e = validateEnum($position, ['Researcher','Student','Class Instructor','Other','Admin'], 'Position')) $ve[] = $e;
if ($e = validateEnum($role,     ['user','admin'], 'Role')) $ve[] = $e;
if ($ve) jsonError(implode(' ', $ve), 422);

$pdo       = getDB();
$userModel = new UserModel($pdo);
if ($userModel->findByUsername($username) !== null) jsonError('Username is already taken.', 409);
if ($userModel->findByEmail($email)       !== null) jsonError('Email address is already registered.', 409);

$newId = $userModel->create([
    'username'      => $username,
    'email'         => $email,
    'password_hash' => hashPassword($password),
    'first_name'    => $firstName,
    'last_name'     => $lastName,
    'middle_name'   => inputStr($body,'middle_name'),
    'position'      => $position,
    'role'          => $role,
    'institution'   => inputStr($body,'institution'),
    'phone'         => inputStr($body,'phone'),
    'bio'           => inputStr($body,'bio'),
]);

jsonSuccess(UserModel::sanitise($userModel->findById($newId)), 201);
