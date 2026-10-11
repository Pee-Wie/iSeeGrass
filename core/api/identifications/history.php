<?php
/**
 * GET /api/identifications/history
 *
 * Returns the identification history for the currently-authenticated admin user.
 * Admin-only — uses require_admin middleware (sets $currentUser, role === 'admin').
 *
 * Query params:
 *   limit  int  1–50   default 50
 *   offset int  ≥0     default 0
 *
 * Response 200:
 *   {
 *     "success": true,
 *     "data": {
 *       "records": [
 *         {
 *           "id":             42,
 *           "image_filename": "seagrass_sample.jpg",   // null if not captured
 *           "top_result":     "Halodule pinifolia",
 *           "top_confidence": 87.30,                   // percent 0–100
 *           "created_at":     "2025-01-15 10:32:00"
 *         },
 *         ...
 *       ],
 *       "total": 42
 *     }
 *   }
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/IdentificationModel.php';

requireMethod('GET');

$limit  = min(50, max(1, (int) ($_GET['limit']  ?? 50)));
$offset = max(0,           (int) ($_GET['offset'] ?? 0));

$pdo   = getDB();
$model = new IdentificationModel($pdo);

$rows = $model->getByUser((int) $currentUser['id'], $limit, $offset);

// Return only the fields the sidebar needs
$records = array_map(static function (array $row): array {
    return [
        'id'             => (int)   $row['id'],
        'image_filename' => isset($row['image_filename']) && $row['image_filename'] !== ''
                                ? $row['image_filename']
                                : null,
        'top_result'     => $row['top_result']     ?? null,
        'top_confidence' => $row['top_confidence'] !== null
                                ? (float) $row['top_confidence']
                                : null,
        'created_at'     => $row['created_at'],
        'title'          => $row['title'] ?? null,
    ];
}, $rows);

jsonSuccess(['records' => $records, 'total' => count($records)]);
