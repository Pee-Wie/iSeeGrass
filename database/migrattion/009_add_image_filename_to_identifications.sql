-- ===== database/migrattion/009_add_image_filename_to_identifications.sql =====
--
-- Adds the `image_filename` column to the `identifications` table so each
-- identification run records the original filename of the uploaded image.
--
-- Safe to run multiple times (IF NOT EXISTS guard).
-- Run this against the `iseegrass` database in phpMyAdmin or via mysql CLI:
--
--   mysql -u root -p iseegrass < 009_add_image_filename_to_identifications.sql
--

ALTER TABLE identifications
    ADD COLUMN IF NOT EXISTS image_filename
        VARCHAR(255)
        DEFAULT NULL
        COMMENT 'Original filename of the uploaded image'
    AFTER image_count;
