<?php
/**
 * GET /api/users
 *
 * Admin endpoint — list all users with optional filtering and pagination.
 *
 * Query params:
 *   search    string  — partial match on name, username, email
 *   position  string  — Researcher | Student | Class Instructor | Other
 *   status    string  — active | inactive
 *   page      int     — 1-based page number (default 1)
 *   limit     int     — records per page (default 25, max 100)
 *
 * Response 200:
 *   {
 *     "success": true,
 *     "data": {
 *       "users": [...],
 *       "total": 42,
 *       "page":  1,
 *       "limit": 25
 *     }
 *   }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/UserModel.php';

setCorsHeaders();
requireMethod('GET');

$limit  = min(100, max(1, (int) ($_GET['limit'] ?? 25)));
$page   = max(1, (int) ($_GET['page']  ?? 1));
$offset = ($page - 1) * $limit;

$filters = [
    'search'   => trim($_GET['search']   ?? ''),
    'position' => trim($_GET['position'] ?? ''),
    'status'   => trim($_GET['status']   ?? ''),
];

$pdo       = getDB();
$userModel = new UserModel($pdo);

$users = $userModel->getAll($filters, $limit, $offset);
$total = $userModel->count($filters);

jsonSuccess([
    'users' => $users,
    'total' => $total,
    'page'  => $page,
    'limit' => $limit,
]);
