-- ===== database/migrattion/008_system_settings.sql =====
--
-- A lightweight key/value settings table used to persist admin-controlled
-- platform configuration (initially just the default CNN engine track).
--
-- Run once against the `iseegrass` database:
--   mysql -u root -p iseegrass < 008_system_settings.sql
--

CREATE TABLE IF NOT EXISTS system_settings (
    `key`        VARCHAR(80)   NOT NULL,
    `value`      TEXT          NOT NULL DEFAULT '',
    `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Admin-managed platform settings (key/value)';

-- Seed the default engine track so the row always exists
INSERT INTO system_settings (`key`, `value`)
VALUES ('cnn_engine_track', 'improved_original')
ON DUPLICATE KEY UPDATE `key` = `key`;   -- no-op if already set
