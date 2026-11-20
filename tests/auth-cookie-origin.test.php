<?php

require_once __DIR__ . '/../core/helpers/auth.php';

function assertCookieOptions(
    string $appUrl,
    string $origin,
    string $apiHost,
    string $expectedSameSite,
    bool $expectedSecure
): void {
    $_ENV['APP_URL'] = $appUrl;
    $_ENV['SESSION_SECURE'] = 'false';
    $_SERVER['HTTP_ORIGIN'] = $origin;
    $_SERVER['HTTP_HOST'] = $apiHost;

    $expires = time() + 3600;
    $options = sessionCookieOptions($expires);
    if ($options['samesite'] !== $expectedSameSite
        || $options['secure'] !== $expectedSecure
        || $options['expires'] !== $expires) {
        throw new RuntimeException(
            "Unexpected cookie policy for {$origin} calling {$apiHost}."
        );
    }
}

assertCookieOptions(
    'https://iseegrass-cap.up.railway.app',
    'https://iseegrass-cap.up.railway.app',
    'iseegrass-res.up.railway.app',
    'None',
    true
);
assertCookieOptions(
    'https://iseegrass-res.up.railway.app',
    'https://iseegrass-res.up.railway.app',
    'iseegrass-res.up.railway.app',
    'Lax',
    false
);
assertCookieOptions(
    'http://localhost:3000',
    'http://localhost:3000',
    'iseegrass-res.up.railway.app',
    'None',
    true
);
assertCookieOptions(
    'http://localhost:3000',
    'http://localhost:3000',
    'localhost',
    'Lax',
    false
);
assertCookieOptions(
    'https://iseegrass-res.up.railway.app',
    'https://iseegrass-cap.up.railway.app',
    'iseegrass-res.up.railway.app',
    'None',
    true
);
assertCookieOptions(
    'https://iseegrass-cap.up.railway.app',
    'http://iseegrass-cap.up.railway.app',
    'iseegrass-res.up.railway.app',
    'Lax',
    false
);
assertCookieOptions(
    'https://iseegrass-res.up.railway.app',
    'https://untrusted.example',
    'iseegrass-res.up.railway.app',
    'Lax',
    false
);
assertCookieOptions(
    'https://iseegrass-res.up.railway.app',
    'https://localhost',
    'iseegrass-res.up.railway.app',
    'None',
    true
);
assertCookieOptions(
    'https://iseegrass-res.up.railway.app',
    'capacitor://localhost',
    'iseegrass-res.up.railway.app',
    'None',
    true
);

echo "Auth cookie origin tests passed.\n";
