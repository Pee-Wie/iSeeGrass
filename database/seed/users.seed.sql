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

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `first_name`, `last_name`, `middle_name`, `position`, `role`, `institution`, `phone`, `bio`, `avatar_url`, `status`, `created_at`, `updated_at`) VALUES
(1, 'toplevel', 'admin@iseegrass.local', '$2y$12$FvAAJPAE7YjoVXaUcnXuUOBSOz6l.1zZ8UdPZJ7Al1af61W7HWBve', 'Youie', 'Mabug-at', NULL, 'Researcher', 'admin', NULL, NULL, NULL, NULL, 'active', '2026-10-13 22:38:10', '2026-10-13 22:38:10'),
(2, 'clark', 'clark@iseegrass.local', '$2y$12$vIaY2Jfz3g4Pv00.0WvQPe.u8tzAQgEp.Z.BMw4.3lIUqiWbvtJ7m', 'Clark Glenn', 'Maahilum', NULL, 'Student', 'user', NULL, NULL, NULL, NULL, 'active', '2026-10-13 22:38:10', '2026-10-15 07:18:47'),
(3, 'emilio', 'emilio@iseegrass.local', '$2y$12$9QSPoecIGiwLcFJzEDhFqu8flpHVtThFdWyOWonXYKDHH0mnp85im', 'Emilio', 'Sumbi IV', NULL, 'Student', 'user', NULL, NULL, NULL, NULL, 'active', '2026-10-13 22:38:10', '2026-10-15 07:15:58'),
(4, 'ralph', 'ralph@iseegrass.local', '$2y$12$vIaY2Jfz3g4Pv00.0WvQPe.u8tzAQgEp.Z.BMw4.3lIUqiWbvtJ7m', 'Ralph Ivan', 'Dela Pena', NULL, 'Student', 'user', NULL, NULL, NULL, '/public/uploads/avatars/4.jpg', 'active', '2026-10-13 22:38:10', '2026-10-15 06:23:09');
