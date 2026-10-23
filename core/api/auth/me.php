<?php
require_once __DIR__ . '/../../config/cors.php';
/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's data.
 * Used by the frontend to restore session state on page load / app launch.
 *
 * Response 200:
 *   { "success": true, "data": { ...user... } }
 *
 * Response 401:
 *   { "success": false, "error": "Authentication required." }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_auth.php';

setCorsHeaders();
requireMethod('GET');

// $currentUser is set by require_auth.php
jsonSuccess($currentUser);
