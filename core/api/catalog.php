<?php
/**
 * core/api/catalog.php
 *
 * Router shim — the frontend calls /core/api/catalog.php for the search
 * endpoint (used by the catalog match card after identification).
 * Delegates to the catalog/ directory handlers based on the request method
 * and an optional 'action' query parameter.
 *
 * Routes:
 *   GET  /core/api/catalog.php              → catalog/index.php  (list/search)
 *   GET  /core/api/catalog.php?action=show  → catalog/show.php
 *   POST /core/api/catalog.php?action=create → catalog/create.php
 *   POST /core/api/catalog.php?action=update → catalog/update.php
 *   POST /core/api/catalog.php?action=delete → catalog/delete.php
 */

$action = trim($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$map = [
    'show'   => __DIR__ . '/catalog/show.php',
    'create' => __DIR__ . '/catalog/create.php',
    'update' => __DIR__ . '/catalog/update.php',
    'delete' => __DIR__ . '/catalog/delete.php',
];

if ($action !== '' && isset($map[$action])) {
    require $map[$action];
} else {
    // Default: list/search
    require __DIR__ . '/catalog/index.php';
}
