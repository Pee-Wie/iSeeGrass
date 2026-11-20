<?php
// GET /api/assessments
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';
require_once __DIR__ . '/../../app/models/AssessmentModel.php';

setCorsHeaders();
requireMethod('GET');

$limit  = min(100, max(1, (int)($_GET['limit'] ?? 20)));
$page   = max(1, (int)($_GET['page']  ?? 1));
$offset = ($page - 1) * $limit;

$filters = [
    'status'    => trim($_GET['status']    ?? ''),
    'date_from' => trim($_GET['date_from'] ?? ''),
    'date_to'   => trim($_GET['date_to']   ?? ''),
    'search'    => trim($_GET['search']    ?? ''),
];

$pdo   = getDB();
$model = new AssessmentModel($pdo);

if ($currentUser['role'] === 'admin') {
    $filters['user_id'] = (int)($_GET['user_id'] ?? 0) ?: null;
    $rows  = $model->getAll($filters, $limit, $offset);
    $total = $model->count($filters);
    foreach ($rows as &$row) {
        $row['can_delete'] = AssessmentModel::canDelete($row, $currentUser);
        $row['can_edit'] = AssessmentModel::canEdit($row, $currentUser);
    }
    unset($row);
} elseif (($currentUser['position'] ?? null) === 'Researcher') {
    $uid   = (int)$currentUser['id'];
    $rows  = $model->getForResearcher($uid, $filters, $limit, $offset);
    $total = $model->countForResearcher($uid, $filters);
    foreach ($rows as &$row) {
        $row['can_edit'] = AssessmentModel::canEdit($row, $currentUser);
        $row['can_delete'] = AssessmentModel::canDelete($row, $currentUser);
    }
    unset($row);
} else {
    $uid   = (int)$currentUser['id'];
    $rows  = $model->getByUser($uid, $filters, $limit, $offset);
    $total = $model->count(array_merge($filters, ['user_id' => $uid]));
    foreach ($rows as &$row) {
        $row['viewer_group'] = AssessmentModel::viewerGroup($row, $currentUser);
        $row['can_edit'] = AssessmentModel::canEdit($row, $currentUser);
        $row['can_delete'] = AssessmentModel::canDelete($row, $currentUser);
    }
    unset($row);
}

jsonSuccess(['assessments' => $rows, 'total' => $total, 'page' => $page, 'limit' => $limit]);
