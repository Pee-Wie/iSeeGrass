<?php
/**
 * GET /api/admin/report-stats
 *
 * Platform statistics for the Operations → Platform Statistics tab.
 * Supports optional date range filtering.
 * Admin only.
 *
 * Query params:
 *   date_from  string  YYYY-MM-DD (optional)
 *   date_to    string  YYYY-MM-DD (optional)
 *
 * Response 200:
 *   {
 *     "success": true,
 *     "data": {
 *       "total_assessments":     18,
 *       "total_identifications": 97,
 *       "active_users":          5,
 *       "top_species":           "Cymodocea rotundata",
 *       "top_species_list": [
 *         { "species": "Cymodocea rotundata", "count": 42 },
 *         { "species": "Halodule pinifolia",  "count": 28 },
 *         { "species": "Halophila spinulosa", "count": 15 }
 *       ],
 *       "flagged_predictions": [
 *         { "id": 3, "model_prediction": "Halodule pinifolia",
 *           "model_confidence": 94.25, "user_correction": "Cymodocea rotundata",
 *           "notes": "…", "username": "user1", "created_at": "…" },
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

$dateFrom = trim($_GET['date_from'] ?? '');
$dateTo   = trim($_GET['date_to']   ?? '');

// Build a reusable date WHERE clause fragment
function dateClause(string $col, string $from, string $to, array &$params): string
{
    $clauses = [];
    if ($from !== '') {
        $clauses[]       = "{$col} >= :date_from";
        $params[':date_from'] = $from . ' 00:00:00';
    }
    if ($to !== '') {
        $clauses[]     = "{$col} <= :date_to";
        $params[':date_to'] = $to . ' 23:59:59';
    }
    return $clauses ? ('WHERE ' . implode(' AND ', $clauses)) : '';
}

// ── Total assessments (date-filtered) ────────────────────────────────────────
$aParams = [];
$aWhere  = dateClause('created_at', $dateFrom, $dateTo, $aParams);
$stmt    = $pdo->prepare("SELECT COUNT(*) FROM assessments {$aWhere}");
foreach ($aParams as $k => $v) $stmt->bindValue($k, $v);
$stmt->execute();
$totalAssessments = (int) $stmt->fetchColumn();

// ── Total identifications (date-filtered) ────────────────────────────────────
$iParams = [];
$iWhere  = dateClause('created_at', $dateFrom, $dateTo, $iParams);
$stmt    = $pdo->prepare("SELECT COUNT(*) FROM identifications {$iWhere}");
foreach ($iParams as $k => $v) $stmt->bindValue($k, $v);
$stmt->execute();
$totalIdentifications = (int) $stmt->fetchColumn();

// ── Active users (users with at least one identification in range) ────────────
$uParams = [];
$uWhere  = $dateFrom !== '' || $dateTo !== ''
    ? 'WHERE ' . implode(' AND ', array_filter([
        $dateFrom !== '' ? 'created_at >= :date_from' : '',
        $dateTo   !== '' ? 'created_at <= :date_to'   : '',
      ]))
    : '';
if ($dateFrom !== '') $uParams[':date_from'] = $dateFrom . ' 00:00:00';
if ($dateTo   !== '') $uParams[':date_to']   = $dateTo   . ' 23:59:59';

$stmt = $pdo->prepare(
    "SELECT COUNT(DISTINCT user_id) FROM identifications {$uWhere}"
);
foreach ($uParams as $k => $v) $stmt->bindValue($k, $v);
$stmt->execute();
$activeUsers = (int) $stmt->fetchColumn();

// ── Top 3 identified species (excluding background substrate) ─────────────────
$tParams = [];
$tExtra  = '';
if ($dateFrom !== '' || $dateTo !== '') {
    $parts = [];
    if ($dateFrom !== '') { $parts[] = 'created_at >= :date_from'; $tParams[':date_from'] = $dateFrom . ' 00:00:00'; }
    if ($dateTo   !== '') { $parts[] = 'created_at <= :date_to';   $tParams[':date_to']   = $dateTo   . ' 23:59:59'; }
    $tExtra = 'AND ' . implode(' AND ', $parts);
}

$stmt = $pdo->prepare(
    "SELECT top_result AS species, COUNT(*) AS cnt
       FROM identifications
      WHERE top_result IS NOT NULL
        AND top_result NOT LIKE '%Background%'
        {$tExtra}
      GROUP BY top_result
      ORDER BY cnt DESC
      LIMIT 3"
);
foreach ($tParams as $k => $v) $stmt->bindValue($k, $v);
$stmt->execute();
$topSpeciesList = $stmt->fetchAll(PDO::FETCH_ASSOC);

$topSpecies = count($topSpeciesList) > 0
    ? $topSpeciesList[0]['species']
    : null;

// ── Latest 3 flagged predictions pending review ───────────────────────────────
$stmt = $pdo->prepare(
    "SELECT fp.id, fp.model_prediction, fp.model_confidence,
            fp.user_correction, fp.notes, fp.created_at, fp.status,
            u.username
       FROM flagged_predictions fp
       LEFT JOIN users u ON u.id = fp.user_id
      WHERE fp.status = 'pending'
      ORDER BY fp.created_at DESC
      LIMIT 3"
);
$stmt->execute();
$flaggedPredictions = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonSuccess([
    'total_assessments'     => $totalAssessments,
    'total_identifications' => $totalIdentifications,
    'active_users'          => $activeUsers,
    'top_species'           => $topSpecies,
    'top_species_list'      => array_map(fn($r) => [
        'species' => $r['species'],
        'count'   => (int) $r['cnt'],
    ], $topSpeciesList),
    'flagged_predictions'   => $flaggedPredictions,
]);
