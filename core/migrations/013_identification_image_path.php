<?php
/**
 * Migration 013 — Store identification image filenames.
 *
 * Run once against the target database:
 *   php core/migrations/013_identification_image_path.php
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDB();
$columns = $pdo->query('SHOW COLUMNS FROM identifications')->fetchAll(PDO::FETCH_COLUMN);

if (!in_array('image_path', $columns, true)) {
    $pdo->exec(
        "ALTER TABLE identifications
         ADD COLUMN image_path VARCHAR(255) DEFAULT NULL
         COMMENT 'Stored identification image filename in public uploads'
         AFTER image_filename"
    );
    echo "Migration 013: added identifications.image_path.\n";
} else {
    echo "Migration 013: identifications.image_path already exists.\n";
}
