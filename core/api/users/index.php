<?php
// GET /api/users  — admin: list all users with filters + pagination
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('GET');

$limit  = min(100, max(1, (int)($_GET['limit'] ?? 25)));
$page   = max(1, (int)($_GET['page']  ?? 1));
$offset = ($page - 1) * $limit;

$filters = [
    'search'        => trim($_GET['search']   ?? ''),
    'position'      => trim($_GET['position'] ?? ''),
    'status'        => trim($_GET['status']   ?? ''),
    'exclude_admin' => true,
];

$pdo       = getDB();
$userModel = new UserModel($pdo);

jsonSuccess([
    'users' => $userModel->getAll($filters, $limit, $offset),
    'total' => $userModel->count($filters),
    'page'  => $page,
    'limit' => $limit,
]);
