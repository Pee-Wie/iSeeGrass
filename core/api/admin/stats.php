<?php
/**
 * GET /api/admin/stats
 *
 * Platform-wide summary statistics for the admin home and dashboard pages.
 * Admin only.
 *
 * Response 200:
 *   {
 *     "success": true,
 *     "data": {
 *       "total_users":           42,
 *       "total_assessments":     18,
 *       "total_identifications": 97,
 *       "total_species":         12,
 *       "flagged_pending":        3,
 *       "recent_activity": [
 *         { "id": 99, "top_result": "Halodule pinifolia",
 *           "top_confidence": 94.25, "created_at": "2025-10-27 14:32:00",
 *           "username": "field_user1" },
 *         ...
 *       ]
 *     }
 *   }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';

setCorsHeaders();
requireMethod('GET');

$pdo = getDB();

// Total registered users (non-admin)
$totalUsers = (int) $pdo->query(
    "SELECT COUNT(*) FROM users WHERE role != 'admin'"
)->fetchColumn();

// Total assessments
$totalAssessments = (int) $pdo->query(
    'SELECT COUNT(*) FROM assessments'
)->fetchColumn();

// Total identification runs
$totalIdentifications = (int) $pdo->query(
    'SELECT COUNT(*) FROM identifications'
)->fetchColumn();

// Total species in catalog (active only)
$totalSpecies = (int) $pdo->query(
    "SELECT COUNT(*) FROM seagrass WHERE status = 'active'"
)->fetchColumn();

// Flagged predictions awaiting review
$flaggedPending = (int) $pdo->query(
    "SELECT COUNT(*) FROM flagged_predictions WHERE status = 'pending'"
)->fetchColumn();

// Recent activity — last 8 identification runs across all users
$stmt = $pdo->query(
    'SELECT i.id, i.top_result, i.top_confidence, i.created_at,
            u.username, u.first_name, u.last_name
       FROM identifications i
       JOIN users u ON u.id = i.user_id
      ORDER BY i.created_at DESC
      LIMIT 8'
);
$recentActivity = $stmt->fetchAll();

jsonSuccess([
    'total_users'           => $totalUsers,
    'total_assessments'     => $totalAssessments,
    'total_identifications' => $totalIdentifications,
    'total_species'         => $totalSpecies,
    'flagged_pending'       => $flaggedPending,
    'recent_activity'       => $recentActivity,
]);
