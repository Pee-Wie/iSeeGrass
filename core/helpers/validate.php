<?php
/**
 * core/helpers/validate.php
 *
 * Simple field-validation helpers used by API controllers.
 * Returns an array of error messages; empty = all valid.
 */

/**
 * Check that required fields are present and non-empty in $data.
 *
 * @param array    $data     The input array (from JSON body or $_POST).
 * @param string[] $fields   Field names that must be present and non-empty.
 * @return string[]          List of error messages (empty if valid).
 */
function requireFields(array $data, array $fields): array
{
    $errors = [];
    foreach ($fields as $field) {
        $val = $data[$field] ?? null;
        if ($val === null || trim((string) $val) === '') {
            $label = ucfirst(str_replace('_', ' ', $field));
            $errors[] = "{$label} is required.";
        }
    }
    return $errors;
}

/**
 * Validate an email address format.
 *
 * @return string|null  Error message, or null if valid.
 */
function validateEmail(string $email): ?string
{
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Invalid email address.';
    }
    return null;
}

/**
 * Validate a username: 3–40 chars, alphanumeric + underscore/hyphen/dot/space.
 *
 * @return string|null  Error message, or null if valid.
 */
function validateUsername(string $username): ?string
{
    $len = strlen($username);
    if ($len < 3 || $len > 40) {
        return 'Username must be between 3 and 40 characters.';
    }
    if (!preg_match('/^[a-zA-Z0-9_\-. ]+$/', $username)) {
        return 'Username may only contain letters, numbers, spaces, underscores, hyphens, and dots.';
    }
    return null;
}

/**
 * Validate password strength: minimum 8 characters.
 *
 * @return string|null  Error message, or null if valid.
 */
function validatePassword(string $password): ?string
{
    if (strlen($password) < 8) {
        return 'Password must be at least 8 characters.';
    }
    return null;
}

/**
 * Validate that a value is within a set of allowed enum values.
 *
 * @param string   $value    The value to check.
 * @param string[] $allowed  Allowed values.
 * @param string   $field    Field name for the error message.
 * @return string|null
 */
function validateEnum(string $value, array $allowed, string $field): ?string
{
    if (!in_array($value, $allowed, true)) {
        $list = implode(', ', $allowed);
        return "{$field} must be one of: {$list}.";
    }
    return null;
}
