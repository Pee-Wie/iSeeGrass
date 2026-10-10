<?php
/**
 * core/helpers/response.php
 *
 * Standardised JSON response helpers.
 * All API endpoints use these instead of hand-rolling json_encode calls.
 */

/**
 * Send a JSON success response and exit.
 *
 * @param mixed $data    The payload (array, object, or null).
 * @param int   $status  HTTP status code (default 200).
 */
function jsonSuccess(mixed $data = null, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json');

    $body = ['success' => true];
    if ($data !== null) {
        $body['data'] = $data;
    }

    echo json_encode($body);
    exit;
}

/**
 * Send a JSON error response and exit.
 *
 * @param string $message  Human-readable error message.
 * @param int    $status   HTTP status code (default 400).
 * @param array  $extra    Optional extra fields to merge into the response.
 */
function jsonError(string $message, int $status = 400, array $extra = []): never
{
    http_response_code($status);
    header('Content-Type: application/json');

    $body = array_merge(['success' => false, 'error' => $message], $extra);

    echo json_encode($body);
    exit;
}

/**
 * Require the request method to match; 405 otherwise.
 */
function requireMethod(string ...$methods): void
{
    $actual = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array(strtoupper($actual), array_map('strtoupper', $methods), true)) {
        jsonError('Method not allowed.', 405);
    }
}

/**
 * Set CORS headers for the local dev / Capacitor hybrid app environment.
 * Call once at the top of every API file before any output.
 */
function setCorsHeaders(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // Allowed origins: localhost variants + capacitor://localhost for Android
    $allowed = [
        'http://localhost:3000',
        'http://localhost',
        'capacitor://localhost',
        'http://127.0.0.1',
        'http://127.0.0.1:3000',
    ];

    if (in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Decode the JSON request body; returns the array or exits with 400.
 */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }

    $data = json_decode($raw, true);
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        jsonError('Invalid JSON in request body.', 400);
    }

    return $data ?? [];
}
