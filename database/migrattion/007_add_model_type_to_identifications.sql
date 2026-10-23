-- ===== database/migrattion/007_add_model_type_to_identifications.sql =====
--
-- Adds the `model_type` column to the `identifications` table so each
-- identification run records which CREYNet taxonomy engine track was used.
--
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards).
-- Run this against the `iseegrass` database in phpMyAdmin or via mysql CLI:
--
--   mysql -u root -p iseegrass < 007_add_model_type_to_identifications.sql
--

ALTER TABLE identifications
    ADD COLUMN IF NOT EXISTS model_type
        ENUM('original', 'improved_original', '6_species_proto')
        NOT NULL
        DEFAULT 'improved_original'
        COMMENT 'CREYNet taxonomy engine track used for this identification run'
    AFTER top_confidence;

-- Index so history views can filter by track efficiently
CREATE INDEX IF NOT EXISTS idx_identifications_model_type
    ON identifications (model_type);
