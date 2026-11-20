<?php
/**
 * Migration 015 — Store optional image GPS coordinates with identifications.
 *
 * Run once against the target database:
 *   php core/migrations/015_identification_gps_coordinates.php
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDB();
$columns = $pdo->query('SHOW COLUMNS FROM identifications')->fetchAll(PDO::FETCH_COLUMN);

if (!in_array('latitude', $columns, true)) {
    $pdo->exec(
        'ALTER TABLE identifications
         ADD COLUMN latitude DECIMAL(10,7) DEFAULT NULL'
    );
    echo "Migration 015: added identifications.latitude.\n";
} else {
    echo "Migration 015: identifications.latitude already exists.\n";
}

$columns = $pdo->query('SHOW COLUMNS FROM identifications')->fetchAll(PDO::FETCH_COLUMN);
if (!in_array('longitude', $columns, true)) {
    $pdo->exec(
        'ALTER TABLE identifications
         ADD COLUMN longitude DECIMAL(10,7) DEFAULT NULL AFTER latitude'
    );
    echo "Migration 015: added identifications.longitude.\n";
} else {
    echo "Migration 015: identifications.longitude already exists.\n";
}
