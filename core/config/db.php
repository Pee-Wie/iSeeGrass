<?php
/**
 * core/config/db.php
 *
 * Returns a singleton PDO instance.
 * All API files get the database handle via:
 *
 *   require_once __DIR__ . '/../../config/db.php';
 *   $pdo = getDB();
 */

require_once __DIR__ . '/env.php';

function getDB(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $host    = env('DB_HOST', '127.0.0.1');
    $port    = env('DB_PORT', '3306');
    $dbname  = env('DB_NAME', 'iseegrass');
    $user    = env('DB_USER', 'root');
    $pass    = env('DB_PASS', '');

    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
    } catch (PDOException $e) {
        // Never expose the raw exception message to clients
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
        exit;
    }

    return $pdo;
}
