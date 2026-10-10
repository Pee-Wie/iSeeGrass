-- ─────────────────────────────────────────────────────────────────────────────
-- iSeeGrass — Seed Users
-- Run after migrations (001_users.sql) are applied.
--
-- Accounts seeded:
--   1. toplevel  / topaccess   → role: admin
--   2. Clark     / researcher  → role: user, position: Student
--
-- Passwords are bcrypt-hashed (cost 12) — never stored as plain text.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO users (
    username,
    email,
    password_hash,
    first_name,
    last_name,
    position,
    role,
    status
) VALUES
-- Admin account
(
    'toplevel',
    'admin@iseegrass.local',
    '$2y$12$TSVLebTBaqP5PBa9bn1DOeq3fKNOyrC3YitwoWZ0b7xHVDw9dmXJS',   -- topaccess
    'Top',
    'Level',
    'Researcher',
    'admin',
    'active'
),
-- Student account
(
    'Clark',
    'clark@iseegrass.local',
    '$2y$12$jvuE0yU6PEK/rxSQQnseCu.2ReZcop6echoaKpFdx6nqaauyj0qYO',   -- researcher
    'Clark',
    'Student',
    'Student',
    'user',
    'active'
);
