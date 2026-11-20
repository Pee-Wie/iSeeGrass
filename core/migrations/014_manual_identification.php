<?php
/**
 * Migration 014 — Support manual identification records and results.
 *
 * Run once against the target database:
 *   php core/migrations/014_manual_identification.php
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDB();
$identificationColumns = [];
foreach ($pdo->query('SHOW COLUMNS FROM identifications')->fetchAll(PDO::FETCH_ASSOC) as $column) {
    $identificationColumns[$column['Field']] = $column;
}

if (!isset($identificationColumns['identification_method'])) {
    $pdo->exec(
        "ALTER TABLE identifications
         ADD COLUMN identification_method ENUM('cnn','manual_key')
         NOT NULL DEFAULT 'cnn' AFTER model_type"
    );
    echo "Migration 014: added identifications.identification_method.\n";
} else {
    echo "Migration 014: identifications.identification_method already exists.\n";
}

if (($identificationColumns['model_type']['Null'] ?? 'YES') === 'NO') {
    $pdo->exec(
        "ALTER TABLE identifications
         MODIFY COLUMN model_type ENUM('original','improved_original','6_species_proto')
         NULL DEFAULT 'improved_original'
         COMMENT 'CNN taxonomy engine track; NULL for manual identifications'"
    );
    echo "Migration 014: made identifications.model_type nullable.\n";
} else {
    echo "Migration 014: identifications.model_type is already nullable.\n";
}

$resultColumns = [];
foreach ($pdo->query('SHOW COLUMNS FROM identification_results')->fetchAll(PDO::FETCH_ASSOC) as $column) {
    $resultColumns[$column['Field']] = $column;
}

if (isset($resultColumns['confidence']) && $resultColumns['confidence']['Null'] === 'NO') {
    $pdo->exec(
        'ALTER TABLE identification_results
         MODIFY COLUMN confidence DECIMAL(5,2) NULL DEFAULT NULL'
    );
    echo "Migration 014: made identification_results.confidence nullable.\n";
} else {
    echo "Migration 014: identification_results.confidence is already nullable.\n";
}
