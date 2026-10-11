-- iSeeGrass complete database setup
-- Review README.md before importing into an existing database.
CREATE DATABASE IF NOT EXISTS iseegrass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE iseegrass;


-- ===== database/migrattion/001_users.sql =====

CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(40) NOT NULL UNIQUE,
    email           VARCHAR(120) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(60) NOT NULL,
    last_name       VARCHAR(60) NOT NULL,
    middle_name     VARCHAR(60) DEFAULT NULL,
    position        ENUM('Researcher','Student','Class Instructor','Other') NOT NULL DEFAULT 'Researcher',
    role            ENUM('user','admin') NOT NULL DEFAULT 'user',
    institution     VARCHAR(120) DEFAULT NULL,
    phone           VARCHAR(30) DEFAULT NULL,
    bio             VARCHAR(280) DEFAULT NULL,
    avatar_url      VARCHAR(255) DEFAULT NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== database/migrattion/002_sessions.sql =====

CREATE TABLE IF NOT EXISTS sessions (
    id              VARCHAR(128) PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    ip_address      VARCHAR(45) DEFAULT NULL,
    user_agent      VARCHAR(255) DEFAULT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    INDEX idx_sessions_expires (expires_at),
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== database/migrattion/003_assessments.sql =====

CREATE TABLE IF NOT EXISTS assessments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         LONGTEXT DEFAULT NULL,
    status          ENUM('draft','in_progress','finalized') NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assessments_user_id (user_id),
    INDEX idx_assessments_status (status),
    INDEX idx_assessments_created (created_at),
    CONSTRAINT fk_assessments_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== database/migrattion/004_identifications.sql =====

CREATE TABLE IF NOT EXISTS identifications (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    image_count     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    top_result      VARCHAR(120) DEFAULT NULL,
    top_confidence  DECIMAL(5,2) DEFAULT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifications_user (user_id),
    INDEX idx_identifications_date (created_at),
    CONSTRAINT fk_identifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_identifications_confidence
        CHECK (top_confidence IS NULL OR (top_confidence >= 0 AND top_confidence <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== database/migrattion/005_identification_results.sql =====

CREATE TABLE IF NOT EXISTS identification_results (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identification_id   INT UNSIGNED NOT NULL,
    species_id          VARCHAR(80) NOT NULL,
    scientific_name     VARCHAR(120) NOT NULL,
    common_name         VARCHAR(120) DEFAULT NULL,
    confidence          DECIMAL(5,2) NOT NULL,
    `rank`              TINYINT UNSIGNED NOT NULL DEFAULT 1,
    INDEX idx_id_results_species (species_id),
    INDEX idx_id_results_rank (`rank`),
    CONSTRAINT fk_id_results_ident
        FOREIGN KEY (identification_id) REFERENCES identifications(id) ON DELETE CASCADE,
    CONSTRAINT chk_id_results_confidence
        CHECK (confidence >= 0 AND confidence <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== database/migrattion/006_seagrass.sql =====

CREATE TABLE IF NOT EXISTS seagrass (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug                VARCHAR(80) NOT NULL UNIQUE,
    scientific_name     VARCHAR(120) NOT NULL,
    common_name         VARCHAR(120) DEFAULT NULL,
    family              VARCHAR(80) DEFAULT NULL,
    genus               VARCHAR(80) DEFAULT NULL,
    region              VARCHAR(120) DEFAULT NULL,
    description         TEXT DEFAULT NULL,
    iucn_status         VARCHAR(20) DEFAULT NULL,
    in_cnn_scope        TINYINT(1) NOT NULL DEFAULT 0,
    status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
    ph_regions          JSON DEFAULT NULL,
    habitat             VARCHAR(200) DEFAULT NULL,
    depth               VARCHAR(60) DEFAULT NULL,
    leaf_shape          VARCHAR(120) DEFAULT NULL,
    leaf_length         VARCHAR(80) DEFAULT NULL,
    color               VARCHAR(80) DEFAULT NULL,
    fun_fact            TEXT DEFAULT NULL,
    status_color        VARCHAR(20) DEFAULT NULL,
    tags                JSON DEFAULT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_catalog_scope (in_cnn_scope),
    INDEX idx_catalog_status (status),
    INDEX idx_catalog_scientific_name (scientific_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== database/seed/catalog.seed.sql =====

INSERT INTO seagrass
    (slug, scientific_name, common_name, family, genus, region, in_cnn_scope, status)
VALUES
    ('enhalus-acoroides', 'Enhalus acoroides', 'Tape Seagrass', 'Hydrocharitaceae', 'Enhalus', 'Negros', 1, 'active'),
    ('thalassia-hemprichii', 'Thalassia hemprichii', 'Hemprich''s Seagrass', 'Hydrocharitaceae', 'Thalassia', 'Negros', 1, 'active'),
    ('halophila-ovalis', 'Halophila ovalis', 'Dugong Grass', 'Hydrocharitaceae', 'Halophila', 'Negros', 1, 'active'),
    ('cymodocea-rotundata', 'Cymodocea rotundata', 'Rotund Cymodocea', 'Cymodoceaceae', 'Cymodocea', 'Negros', 1, 'active'),
    ('halodule-uninervis', 'Halodule uninervis', 'Spade Grass', 'Cymodoceaceae', 'Halodule', 'Negros', 1, 'active'),
    ('syringodium-isoetifolium', 'Syringodium isoetifolium', 'Needle Seagrass', 'Cymodoceaceae', 'Syringodium', 'Negros', 1, 'active')
ON DUPLICATE KEY UPDATE
    scientific_name = VALUES(scientific_name),
    common_name = VALUES(common_name),
    family = VALUES(family),
    genus = VALUES(genus),
    region = VALUES(region),
    in_cnn_scope = VALUES(in_cnn_scope),
    status = VALUES(status);
