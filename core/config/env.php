<?php
/**
 * core/config/env.php
 *
 * Loads variables from the project root .env file into $_ENV and getenv().
 * Must be required before db.php or any code that reads env values.
 */

function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        // Skip comment lines
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }

        // Only process lines with an = sign
        if (!str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);

        // Strip surrounding quotes if present
        if (
            strlen($value) >= 2 &&
            (($value[0] === '"'  && $value[-1] === '"') ||
             ($value[0] === "'"  && $value[-1] === "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        // Always set from file — overrides any pre-existing system env value
        // so that editing .env always takes effect without a server restart.
        $_ENV[$key] = $value;
        putenv("{$key}={$value}");
    }
}

// Resolve the .env path.
// On Railway (or any host with real env injection), set APP_ENV_FILE to an empty
// string or a specific path — loadEnv() will either skip the empty path or load
// from the explicit location. Railway injects variables natively so no file is needed.
// On local XAMPP, APP_ENV_FILE is unset, so we fall back to two levels up from
// core/config/ which resolves to the project root where .env lives.
$projectRoot = dirname(__DIR__, 2);   // /media/codex/Shared/iSeeGrass (local) or DocumentRoot (production)
$envFile     = getenv('APP_ENV_FILE') ?: ($projectRoot . '/.env');
loadEnv($envFile);

/**
 * Convenience wrapper — reads from $_ENV, $_SERVER, or getenv().
 * $_SERVER is checked because Apache passes injected env vars there even
 * when PHP's getenv() / $_ENV don't see them (e.g. Railway, Docker).
 */
function env(string $key, mixed $default = null): mixed
{
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    if (array_key_exists($key, $_SERVER)) {
        return $_SERVER[$key];
    }
    $val = getenv($key);
    return ($val !== false) ? $val : $default;
}
