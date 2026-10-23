<?php
/**
 * core/helpers/auth.php
 *
 * Low-level auth helpers: session cookie management, token generation,
 * and password hashing wrappers.
 *
 * Higher-level middleware (require_auth, require_admin) lives in
 * core/app/middleware/ and calls these helpers.
 */

require_once __DIR__ . '/../config/env.php';

// ── Cookie / session token helpers ───────────────────────────────────────────

/**
 * Generate a cryptographically random session token (hex string).
 * Length = 128 hex chars = 64 bytes of entropy.
 */
function generateSessionToken(): string
{
    return bin2hex(random_bytes(64));
}

/**
 * Return the configured session cookie name.
 */
function sessionCookieName(): string
{
    return env('SESSION_COOKIE_NAME', 'iseegsess');
}

/**
 * Return session lifetime in seconds from env (SESSION_LIFETIME_DAYS).
 */
function sessionLifetimeSeconds(): int
{
    $days = (int) env('SESSION_LIFETIME_DAYS', 7);
    return $days * 86400;
}

/**
 * Set the session cookie on the response.
 *
 * @param string $token     The session token to store in the cookie.
 * @param int    $lifetime  Seconds from now. 0 = session cookie.
 */
function setSessionCookie(string $token, int $lifetime = 0): void
{
    $secure   = filter_var(env('SESSION_SECURE', 'false'), FILTER_VALIDATE_BOOLEAN);
    $expires  = $lifetime > 0 ? time() + $lifetime : 0;

    // SameSite=Lax works correctly in Android WebView (Capacitor) and persists
    // across app restarts. SameSite=None requires the cookie to be sent with
    // every cross-site request and is NOT reliably persisted by Android's
    // WebView CookieManager across process kills — causing spurious logouts.
    // Lax is the safe default for both mobile WebView and standard browsers.
    $sameSite = 'Lax';

    setcookie(sessionCookieName(), $token, [
        'expires'  => $expires,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);
}

/**
 * Clear the session cookie (set expiry to the past).
 */
function clearSessionCookie(): void
{
    setcookie(sessionCookieName(), '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Read the session token from the request cookie, or return null.
 */
function getSessionTokenFromCookie(): ?string
{
    $name = sessionCookieName();
    $token = $_COOKIE[$name] ?? null;

    // Basic sanity check: valid hex string, correct length
    if ($token === null || !ctype_xdigit($token) || strlen($token) !== 128) {
        return null;
    }

    return $token;
}

// ── Password helpers ──────────────────────────────────────────────────────────

/**
 * Hash a plain-text password using bcrypt.
 * bcrypt is PHP's default via PASSWORD_DEFAULT (currently PASSWORD_BCRYPT).
 */
function hashPassword(string $plain): string
{
    return password_hash($plain, PASSWORD_BCRYPT, ['cost' => 12]);
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
function verifyPassword(string $plain, string $hash): bool
{
    return password_verify($plain, $hash);
}

// ── Input sanitisation helpers ────────────────────────────────────────────────

/**
 * Trim a string value from user input. Returns null if key is absent.
 */
function inputStr(array $data, string $key, ?string $default = null): ?string
{
    if (!isset($data[$key])) {
        return $default;
    }
    $val = trim((string) $data[$key]);
    return $val === '' ? $default : $val;
}

/**
 * Retrieve an integer value from user input.
 */
function inputInt(array $data, string $key, ?int $default = null): ?int
{
    if (!isset($data[$key])) {
        return $default;
    }
    return (int) $data[$key];
}
