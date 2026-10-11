<?php
/**
 * Migration 009: Rename seagrass_catalog -> seagrass and add missing columns.
 * Idempotent: each step checks current state before acting.
 */

require_once __DIR__ . '/../../core/config/env.php';
require_once __DIR__ . '/../../core/config/db.php';

$pdo = getDB();

try {
    // 1. Rename table if seagrass_catalog exists and seagrass does not
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('seagrass_catalog', $tables) && !in_array('seagrass', $tables)) {
        $pdo->exec("RENAME TABLE seagrass_catalog TO seagrass");
        echo "Renamed seagrass_catalog to seagrass\n";
    } elseif (in_array('seagrass', $tables)) {
        echo "Table seagrass already exists, skip rename\n";
    } else {
        echo "ERROR: seagrass_catalog not found and seagrass does not exist\n";
        exit(1);
    }

    // 2. Add missing columns (each guarded by SHOW COLUMNS check)
    $cols = $pdo->query("SHOW COLUMNS FROM seagrass")->fetchAll(PDO::FETCH_COLUMN);
    $toAdd = [
        'ph_regions'   => 'JSON DEFAULT NULL',
        'habitat'      => 'VARCHAR(200) DEFAULT NULL',
        'depth'        => 'VARCHAR(60) DEFAULT NULL',
        'leaf_shape'   => 'VARCHAR(120) DEFAULT NULL',
        'leaf_length'  => 'VARCHAR(80) DEFAULT NULL',
        'color'        => 'VARCHAR(80) DEFAULT NULL',
        'fun_fact'     => 'TEXT DEFAULT NULL',
        'status_color' => 'VARCHAR(20) DEFAULT NULL',
        'tags'         => 'JSON DEFAULT NULL',
    ];
    foreach ($toAdd as $col => $def) {
        if (!in_array($col, $cols)) {
            $pdo->exec("ALTER TABLE seagrass ADD COLUMN `$col` $def");
            echo "Added column: $col\n";
        } else {
            echo "Column $col already exists, skip\n";
        }
    }

    // 3. Verify
    $count = $pdo->query("SELECT COUNT(*) FROM seagrass")->fetchColumn();
    echo "Migration complete. seagrass table has $count rows.\n";

} catch (Exception $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
    exit(1);
}
