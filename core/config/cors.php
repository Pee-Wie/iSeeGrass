<?php
/**
 * core/config/cors.php
 *
 * Must be the FIRST include in every API endpoint.
 * Sends CORS headers and handles OPTIONS preflight immediately —
 * before any auth check, DB connection, or other logic runs.
 *
 * Without this, the browser's preflight OPTIONS request hits the auth
 * middleware, gets a 401 with no CORS headers, and fetch() throws a
 * network error (not a JSON error) on the client.
 *
 * APP_URL in .env is always added to the allowed-origins list so the
 * live deployment never needs a code change — only a .env update.
 */

// Load environment variables so APP_URL is available.
// env.php is idempotent; requiring it here is safe even if db.php already
// loaded it earlier (PHP's require_once deduplicates by resolved path).
require_once __DIR__ . '/env.php';

$appUrl = rtrim(env('APP_URL', ''), '/');   // e.g. https://iseegrass.page.gd

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowed = array_filter([
    $appUrl,                        // live domain from .env  ← key addition
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'capacitor://localhost',
]);

if ($origin !== '' && in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    // No Origin header (same-origin curl / direct PHP call).
    // Fall back to the configured app URL so the default is never localhost
    // on a production server.
    header("Access-Control-Allow-Origin: {$appUrl}");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Max-Age: 600');

// Answer preflight immediately — no auth, no DB
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
