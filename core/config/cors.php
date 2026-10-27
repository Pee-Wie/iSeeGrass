<?php
/**
 * core/config/cors.php
 *
 * Must be the FIRST include in every API endpoint.
 * Sends CORS headers and handles OPTIONS preflight immediately —
 * before any auth check, DB connection, or other logic runs.
 *
 * Also starts output buffering so any accidental PHP notice/warning
 * doesn't corrupt the JSON response body.
 *
 * APP_URL in .env is always added to the allowed-origins list so the
 * live deployment never needs a code change — only a .env update.
 */

// Start output buffer immediately — discards any stray output before JSON is sent.
ob_start();

// Load environment variables so APP_URL is available.
require_once __DIR__ . '/env.php';

// Normalise APP_URL — ensure it has a scheme so origin comparisons work.
$appUrl = rtrim((string) env('APP_URL', ''), '/');
if ($appUrl !== '' && !str_starts_with($appUrl, 'http')) {
    $appUrl = 'https://' . $appUrl;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowed = array_filter([
    $appUrl,
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'capacitor://localhost',
]);

// Check exact match first.
// Fallback: also allow any *.up.railway.app origin (covers Railway preview URLs).
$originAllowed = ($origin !== '' && in_array($origin, $allowed, true))
    || ($origin !== '' && preg_match('/^https:\/\/[a-z0-9-]+\.up\.railway\.app$/', $origin));

if ($originAllowed) {
    header("Access-Control-Allow-Origin: {$origin}");
} elseif ($appUrl !== '') {
    // Same-origin server-side call (no Origin header) or unknown origin —
    // reflect the configured app URL.
    header("Access-Control-Allow-Origin: {$appUrl}");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Max-Age: 600');

// Answer preflight immediately — no auth, no DB
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
