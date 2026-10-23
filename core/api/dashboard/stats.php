<?php
// GET /api/dashboard/stats  — returns counts for the current user's dashboard
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';

setCorsHeaders();
requireMethod('GET');

$pdo = getDB();
$uid = (int)$currentUser['id'];

// Total identification runs
$stmt = $pdo->prepare('SELECT COUNT(*) FROM identifications WHERE user_id = :uid');
$stmt->execute([':uid' => $uid]);
$identCount = (int)$stmt->fetchColumn();

// Total assessments saved
$stmt = $pdo->prepare('SELECT COUNT(*) FROM assessments WHERE user_id = :uid');
$stmt->execute([':uid' => $uid]);
$assessmentCount = (int)$stmt->fetchColumn();

// Unique species identified (from identification_results via identifications)
$stmt = $pdo->prepare(
    'SELECT COUNT(DISTINCT ir.species_id)
       FROM identification_results ir
       JOIN identifications i ON i.id = ir.identification_id
      WHERE i.user_id = :uid'
);
$stmt->execute([':uid' => $uid]);
$speciesCount = (int)$stmt->fetchColumn();

// Recent activity (last 6 identifications with top result)
$stmt = $pdo->prepare(
    'SELECT id, top_result, top_confidence, created_at
       FROM identifications
      WHERE user_id = :uid
      ORDER BY created_at DESC
      LIMIT 6'
);
$stmt->execute([':uid' => $uid]);
$recentActivity = $stmt->fetchAll();

jsonSuccess([
    'identifications' => $identCount,
    'assessments'     => $assessmentCount,
    'species'         => $speciesCount,
    'recent_activity' => $recentActivity,
]);
