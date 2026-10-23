<?php
require_once __DIR__ . '/../../config/cors.php';
/**
 * GET /api/catalog
 *
 * Public-readable list of seagrass catalog entries.
 * No authentication required (guests can browse the catalog).
 *
 * Query params:
 *   status       string  — active | inactive (default: active only for non-admin)
 *   in_cnn_scope int     — 0 | 1
 *   region       string
 *   search       string  — partial match on scientific_name or common_name
 *   page         int
 *   limit        int     (default 100, max 200)
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../app/models/SessionModel.php';
require_once __DIR__ . '/../../app/models/UserModel.php';
require_once __DIR__ . '/../../app/models/CatalogModel.php';

setCorsHeaders();
requireMethod('GET');

// Optional auth check — admin can see inactive entries
$token       = getSessionTokenFromCookie();
$isAdmin     = false;

if ($token !== null) {
    $pdo          = getDB();
    $sessionModel = new SessionModel($pdo);
    $session      = $sessionModel->find($token);
    if ($session !== null) {
        $userModel = new UserModel($pdo);
        $user      = $userModel->findById((int) $session['user_id']);
        if ($user && $user['role'] === 'admin') {
            $isAdmin = true;
        }
    }
}

$limit  = min(200, max(1, (int) ($_GET['limit'] ?? 100)));
$page   = max(1, (int) ($_GET['page']  ?? 1));
$offset = ($page - 1) * $limit;

$filters = [
    'search'       => trim($_GET['search']       ?? ''),
    'region'       => trim($_GET['region']        ?? ''),
    'in_cnn_scope' => $_GET['in_cnn_scope']       ?? '',
];

// Non-admin always sees only active entries
if (!$isAdmin) {
    $filters['status'] = 'active';
} elseif (!empty($_GET['status'])) {
    $filters['status'] = trim($_GET['status']);
}

$pdo          = $pdo ?? getDB();
$catalogModel = new CatalogModel($pdo);

$entries = $catalogModel->getAll($filters, $limit, $offset);
$total   = $catalogModel->count($filters);

jsonSuccess([
    'catalog' => $entries,
    'total'   => $total,
    'page'    => $page,
    'limit'   => $limit,
]);
