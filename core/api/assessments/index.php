<?php
/**
 * GET /api/assessments
 *
 * Returns assessments for the authenticated user.
 * Admins get all assessments across users; regular users only see their own.
 *
 * Query params:
 *   status     string  — draft | in_progress | finalized
 *   user_id    int     — (admin only) filter by a specific user
 *   date_from  string  — Y-m-d
 *   date_to    string  — Y-m-d
 *   search     string  — partial title match
 *   page       int     — 1-based
 *   limit      int     — per page (default 20, max 100)
 *
 * Response 200:
 *   { "success": true, "data": { "assessments": [...], "total": N, "page": P, "limit": L } }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('GET');

$limit  = min(100, max(1, (int) ($_GET['limit'] ?? 20)));
$page   = max(1, (int) ($_GET['page']  ?? 1));
$offset = ($page - 1) * $limit;

$filters = [
    'status'    => trim($_GET['status']    ?? ''),
    'date_from' => trim($_GET['date_from'] ?? ''),
    'date_to'   => trim($_GET['date_to']   ?? ''),
    'search'    => trim($_GET['search']    ?? ''),
];

$pdo             = getDB();
$assessmentModel = new AssessmentModel($pdo);

if ($currentUser['role'] === 'admin') {
    // Admin can additionally filter by a specific user_id
    $filters['user_id'] = (int) ($_GET['user_id'] ?? 0) ?: null;
    $assessments = $assessmentModel->getAll($filters, $limit, $offset);
    $total       = $assessmentModel->count($filters);
} else {
    $userId      = (int) $currentUser['id'];
    $assessments = $assessmentModel->getByUser($userId, $filters, $limit, $offset);
    $total       = $assessmentModel->count(array_merge($filters, ['user_id' => $userId]));
}

jsonSuccess([
    'assessments' => $assessments,
    'total'       => $total,
    'page'        => $page,
    'limit'       => $limit,
]);
