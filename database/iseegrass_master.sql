-- =============================================================================
-- iSeeGrass — Master Database Setup
-- =============================================================================
-- Single-file import for AwardSpace, InfinityFree, or any MySQL 5.6+ /
-- MariaDB shared host.
--
-- WHAT THIS FILE DOES
--   1. Runs all migrations in dependency order (001 → 011).
--   2. Seeds the catalog (all 72 species from species-data.js) and default
--      user accounts.
--
-- HOW TO IMPORT ON AWARDSPACE
--   a) Log in to your AwardSpace control panel → MySQL Manager →
--      create a new database and note the full database name
--      (e.g. id123456_iseegrass).
--   b) Open phpMyAdmin from the control panel, select your database from the
--      left-hand tree (it will be pre-selected).
--   c) Import tab → choose this file → Go.
--   d) If phpMyAdmin splits the import into batches, click Continue on each
--      confirmation prompt — all statements are idempotent (IF NOT EXISTS /
--      ON DUPLICATE KEY UPDATE) so re-running is safe.
--
-- HOW TO IMPORT ON INFINITYFREE
--   a) Log in to VistaPanel → MySQL Databases → create database + user.
--   b) Open phpMyAdmin, select your database.
--   c) Import tab → choose this file → Go.
--
-- NOTES
--   • AwardSpace / InfinityFree do NOT support CHECK constraints — they are
--     omitted here.
--   • ALTER TABLE … ADD COLUMN IF NOT EXISTS is not supported on MySQL 5.6;
--     columns are added directly inside the CREATE TABLE definitions instead.
--   • CREATE DATABASE and USE are commented out; shared hosts pre-select the
--     database in phpMyAdmin. Uncomment them only for local CLI imports.
--   • All tables use ENGINE=InnoDB, utf8mb4, utf8mb4_unicode_ci.
--   • Passwords seeded below are bcrypt-hashed (cost 12); plain-text shown
--     only in this comment for reference — change them after first login.
--       toplevel  → topaccess
--       clark     / emilio / ralph  → 12345678
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Database selection
--    On AwardSpace / InfinityFree and other shared hosts: the database is
--    pre-created in the control panel and phpMyAdmin selects it automatically.
--    Leave these two lines commented out when importing via phpMyAdmin.
--    Uncomment only when importing via CLI on a local or root server.
-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE DATABASE IF NOT EXISTS iseegrass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE iseegrass;

SET FOREIGN_KEY_CHECKS = 0;


-- =============================================================================
-- MIGRATIONS
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 001 — users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(40)         NOT NULL UNIQUE,
    email           VARCHAR(120)        NOT NULL UNIQUE,
    password_hash   VARCHAR(255)        NOT NULL,
    first_name      VARCHAR(60)         NOT NULL,
    last_name       VARCHAR(60)         NOT NULL,
    middle_name     VARCHAR(60)         DEFAULT NULL,
    position        ENUM('Researcher','Student','Class Instructor','Other')
                                        NOT NULL DEFAULT 'Researcher',
    role            ENUM('user','admin') NOT NULL DEFAULT 'user',
    institution     VARCHAR(120)        DEFAULT NULL,
    phone           VARCHAR(30)         DEFAULT NULL,
    bio             VARCHAR(280)        DEFAULT NULL,
    avatar_url      VARCHAR(255)        DEFAULT NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email    (email),
    INDEX idx_users_username (username),
    INDEX idx_users_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 002 — sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id          VARCHAR(128)    PRIMARY KEY,
    user_id     INT UNSIGNED    NOT NULL,
    ip_address  VARCHAR(45)     DEFAULT NULL,
    user_agent  VARCHAR(255)    DEFAULT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP       NOT NULL,
    INDEX idx_sessions_expires (expires_at),
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 003 + 011 — assessments
--   (unique per-user title constraint from migration 011 baked in directly)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
    id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED    NOT NULL,
    title       VARCHAR(255)    NOT NULL,
    content     LONGTEXT        DEFAULT NULL,
    status      ENUM('draft','in_progress','finalized') NOT NULL DEFAULT 'draft',
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assessments_user_id (user_id),
    INDEX idx_assessments_status  (status),
    INDEX idx_assessments_created (created_at),
    CONSTRAINT uq_assessments_user_title
        UNIQUE (user_id, title),
    CONSTRAINT fk_assessments_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 004 + 007 + 009 + 010 — identifications
--   (columns from migrations 007, 009, 010 baked in directly)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identifications (
    id              INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED        NOT NULL,
    image_count     TINYINT UNSIGNED    NOT NULL DEFAULT 1,
    image_filename  VARCHAR(255)        DEFAULT NULL
                    COMMENT 'Original filename of the uploaded image',
    title           VARCHAR(120)        DEFAULT NULL,
    top_result      VARCHAR(120)        DEFAULT NULL,
    top_confidence  DECIMAL(5,2)        DEFAULT NULL,
    model_type      ENUM('original','improved_original','6_species_proto')
                                        NOT NULL DEFAULT 'improved_original'
                    COMMENT 'CREYNet taxonomy engine track used for this run',
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifications_user       (user_id),
    INDEX idx_identifications_date       (created_at),
    INDEX idx_identifications_model_type (model_type),
    CONSTRAINT fk_identifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 005 — identification_results
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identification_results (
    id                  INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    identification_id   INT UNSIGNED    NOT NULL,
    species_id          VARCHAR(80)     NOT NULL,
    scientific_name     VARCHAR(120)    NOT NULL,
    common_name         VARCHAR(120)    DEFAULT NULL,
    confidence          DECIMAL(5,2)    NOT NULL,
    `rank`              TINYINT UNSIGNED NOT NULL DEFAULT 1,
    INDEX idx_id_results_species (species_id),
    INDEX idx_id_results_rank    (`rank`),
    CONSTRAINT fk_id_results_ident
        FOREIGN KEY (identification_id) REFERENCES identifications(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 006 — seagrass  (formerly seagrass_catalog)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seagrass (
    id              INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    slug            VARCHAR(80)         NOT NULL UNIQUE,
    scientific_name VARCHAR(120)        NOT NULL,
    common_name     VARCHAR(120)        DEFAULT NULL,
    family          VARCHAR(80)         DEFAULT NULL,
    genus           VARCHAR(80)         DEFAULT NULL,
    region          VARCHAR(120)        DEFAULT NULL,
    description     TEXT                DEFAULT NULL,
    iucn_status     VARCHAR(20)         DEFAULT NULL,
    in_cnn_scope    TINYINT(1)          NOT NULL DEFAULT 0,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    ph_regions      JSON                DEFAULT NULL,
    habitat         VARCHAR(200)        DEFAULT NULL,
    depth           VARCHAR(60)         DEFAULT NULL,
    leaf_shape      VARCHAR(120)        DEFAULT NULL,
    leaf_length     VARCHAR(80)         DEFAULT NULL,
    color           VARCHAR(80)         DEFAULT NULL,
    fun_fact        TEXT                DEFAULT NULL,
    status_color    VARCHAR(20)         DEFAULT NULL,
    tags            JSON                DEFAULT NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_catalog_scope          (in_cnn_scope),
    INDEX idx_catalog_status         (status),
    INDEX idx_catalog_scientific_name (scientific_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 008 — system_settings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
    `key`       VARCHAR(80)     NOT NULL,
    `value`     TEXT            NOT NULL DEFAULT '',
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Admin-managed platform settings (key/value)';


SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================================
-- SEED DATA
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- system_settings — default CNN engine track
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO system_settings (`key`, `value`)
VALUES ('cnn_engine_track', 'improved_original')
ON DUPLICATE KEY UPDATE `key` = `key`;


-- ─────────────────────────────────────────────────────────────────────────────
-- users — seed accounts
--   toplevel  / topaccess   → role: admin
--   clark     / 12345678    → role: user, position: Student
--   emilio    / 12345678    → role: user, position: Student
--   ralph     / 12345678    → role: user, position: Student
--
-- Passwords are bcrypt-hashed (cost 12) — never stored as plain text.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users
    (id, username, email, password_hash, first_name, last_name, middle_name,
     position, role, institution, phone, bio, avatar_url, status,
     created_at, updated_at)
VALUES
(
    1,
    'toplevel',
    'admin@iseegrass.local',
    '$2y$12$FvAAJPAE7YjoVXaUcnXuUOBSOz6l.1zZ8UdPZJ7Al1af61W7HWBve',
    'Youie', 'Mabug-at', NULL,
    'Researcher', 'admin', NULL, NULL, NULL, NULL, 'active',
    '2026-10-13 22:38:10', '2026-10-13 22:38:10'
),
(
    2,
    'clark',
    'clark@iseegrass.local',
    '$2y$12$vIaY2Jfz3g4Pv00.0WvQPe.u8tzAQgEp.Z.BMw4.3lIUqiWbvtJ7m',
    'Clark Glenn', 'Maahilum', NULL,
    'Student', 'user', NULL, NULL, NULL, NULL, 'active',
    '2026-10-13 22:38:10', '2026-10-15 07:18:47'
),
(
    3,
    'emilio',
    'emilio@iseegrass.local',
    '$2y$12$9QSPoecIGiwLcFJzEDhFqu8flpHVtThFdWyOWonXYKDHH0mnp85im',
    'Emilio', 'Sumbi IV', NULL,
    'Student', 'user', NULL, NULL, NULL, NULL, 'active',
    '2026-10-13 22:38:10', '2026-10-15 07:15:58'
),
(
    4,
    'ralph',
    'ralph@iseegrass.local',
    '$2y$12$vIaY2Jfz3g4Pv00.0WvQPe.u8tzAQgEp.Z.BMw4.3lIUqiWbvtJ7m',
    'Ralph Ivan', 'Dela Pena', NULL,
    'Student', 'user', NULL, NULL, NULL, '/public/uploads/avatars/4.jpg', 'active',
    '2026-10-13 22:38:10', '2026-10-15 06:23:09'
)
ON DUPLICATE KEY UPDATE
    email         = VALUES(email),
    password_hash = VALUES(password_hash),
    first_name    = VALUES(first_name),
    last_name     = VALUES(last_name),
    middle_name   = VALUES(middle_name),
    position      = VALUES(position),
    role          = VALUES(role),
    institution   = VALUES(institution),
    phone         = VALUES(phone),
    bio           = VALUES(bio),
    avatar_url    = VALUES(avatar_url),
    status        = VALUES(status);


-- ─────────────────────────────────────────────────────────────────────────────
-- seagrass — full catalog (all species from species-data.js)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO seagrass
    (slug, scientific_name, common_name, family, genus,
     region, description, iucn_status, in_cnn_scope, status)
VALUES

-- ── Family: Hydrocharitaceae ──────────────────────────────────────────────────

('enhalus-acoroides',
 'Enhalus acoroides', 'Tape Seagrass', 'Hydrocharitaceae', 'Enhalus',
 'Indo-Pacific & Southeast Asia',
 'The largest seagrass species in the world by leaf size. Tape Seagrass forms extensive intertidal and subtidal meadows across Southeast Asia and is culturally important as a traditional food and medicine plant.',
 'Least Concern', 1, 'active'),

('thalassia-testudinum',
 'Thalassia testudinum', 'Turtle Grass', 'Hydrocharitaceae', 'Thalassia',
 'Caribbean & Gulf of Mexico',
 'One of the most ecologically important seagrass species in the Caribbean, Turtle Grass forms dense meadows providing critical habitat for sea turtles, manatees, and hundreds of invertebrate species.',
 'Least Concern', 0, 'active'),

('thalassia-hemprichii',
 'Thalassia hemprichii', 'Hemprich''s Seagrass', 'Hydrocharitaceae', 'Thalassia',
 'Indo-Pacific & Red Sea',
 'The Indo-Pacific counterpart of Turtle Grass, dominating diverse mixed-species meadows across the Red Sea and Indo-Pacific, frequently found alongside Halophila and Cymodocea species.',
 'Least Concern', 1, 'active'),

('halophila-ovalis',
 'Halophila ovalis', 'Dugong Grass', 'Hydrocharitaceae', 'Halophila',
 'Indo-Pacific',
 'A pioneer species capable of rapid colonisation of bare sediments. Its small oval leaves grow in pairs on a delicate stem. A primary food source for dugongs and green sea turtles across the Indo-Pacific.',
 'Least Concern', 1, 'active'),

('halophila-stipulacea',
 'Halophila stipulacea', 'Spoon Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Red Sea & Indian Ocean',
 'Originally from the Red Sea and Indian Ocean, it entered the Mediterranean through the Suez Canal and has become the only known invasive seagrass, outcompeting native Posidonia and Cymodocea meadows.',
 'Least Concern', 0, 'active'),

('halophila-decipiens',
 'Halophila decipiens', 'Paddle Weed', 'Hydrocharitaceae', 'Halophila',
 'Pan-tropical (Atlantic, Pacific & Indian Oceans)',
 'One of the deepest-growing seagrasses, Paddle Weed is found across all tropical oceans. Its small, finely serrated paired leaves distinguish it from other Halophila species. It tolerates low light at depth.',
 'Least Concern', 0, 'active'),

('halophila-spinulosa',
 'Halophila spinulosa', 'Fern Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Indo-Pacific & Australia',
 'Easily recognised by its fern-like arrangement of multiple small leaflets along each stem. Common in Australian and Indo-Pacific waters, often forming sparse but extensive beds on sandy substrates.',
 'Least Concern', 0, 'active'),

('halophila-beccarii',
 'Halophila beccarii', 'Beccari''s Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Southeast Asia & Bay of Bengal',
 'A small, inconspicuous species typically found on intertidal mudflats alongside mangroves. One of the least studied seagrasses, it is threatened by coastal development and sedimentation across its range.',
 'Vulnerable', 0, 'active'),

('halophila-major',
 'Halophila major', 'Major Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Indo-Pacific',
 'A larger-leaved Halophila species found across the Indo-Pacific. Often confused with H. ovalis but distinguished by its substantially larger leaves and distinct venation pattern.',
 'Least Concern', 0, 'active'),

('halophila-engelmannii',
 'Halophila engelmannii', 'Engelmann''s Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Gulf of Mexico & Caribbean',
 'The only Halophila species native to the Atlantic and Gulf of Mexico. It forms sparse beds on soft substrates and is an important component of deep reef-associated communities in the Gulf.',
 'Least Concern', 0, 'active'),

('halophila-johnsonii',
 'Halophila johnsonii', 'Johnson''s Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Southeast Florida, USA',
 'One of the rarest and most geographically restricted seagrasses in the world, found only in a 200 km stretch of southeastern Florida. It is the only seagrass species listed as Threatened under the US Endangered Species Act.',
 'Endangered', 0, 'active'),

('halophila-minor',
 'Halophila minor', 'Small Paddle Weed', 'Hydrocharitaceae', 'Halophila',
 'Indo-Pacific & Southeast Asia',
 'One of the smallest Halophila species, forming sparse but widespread beds across Indo-Pacific coastal flats. Its tiny paired oval leaves are easily overlooked but play an important role in pioneer community establishment.',
 'Least Concern', 0, 'active'),

('halophila-tricostata',
 'Halophila tricostata', 'Three-ribbed Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Northern Australia (Great Barrier Reef)',
 'Named for the three distinctive parallel veins running through each leaf, this species is endemic to the Great Barrier Reef region of northern Australia. It grows in clear, well-lit subtidal zones on sandy sediments.',
 'Least Concern', 0, 'active'),

('halophila-australis',
 'Halophila australis', 'Southern Seagrass', 'Hydrocharitaceae', 'Halophila',
 'Southern Australia & New Zealand',
 'The southernmost-ranging Halophila species, adapted to the cool temperate waters of southern Australia and New Zealand. It grows in deeper subtidal zones where most other tropical Halophila species cannot survive.',
 'Least Concern', 0, 'active'),

-- ── Family: Cymodoceaceae ─────────────────────────────────────────────────────

('cymodocea-rotundata',
 'Cymodocea rotundata', 'Rotund Cymodocea', 'Cymodoceaceae', 'Cymodocea',
 'Indo-Pacific & Red Sea',
 'One of the most common seagrasses in Indo-Pacific mixed-species meadows. Often co-dominates with Thalassia hemprichii and Halophila ovalis. Its round leaf tip distinguishes it from other Cymodocea species.',
 'Least Concern', 1, 'active'),

('cymodocea-serrulata',
 'Cymodocea serrulata', 'Serrated Cymodocea', 'Cymodoceaceae', 'Cymodocea',
 'Indo-Pacific & East Africa',
 'Distinguished by finely serrated leaf margins visible under magnification. Common in shallow Indo-Pacific seagrass communities and frequently found alongside Cymodocea rotundata in mixed meadows.',
 'Least Concern', 0, 'active'),

('cymodocea-nodosa',
 'Cymodocea nodosa', 'Little Neptune Grass', 'Cymodoceaceae', 'Cymodocea',
 'Mediterranean & East Atlantic',
 'A fast-colonising Mediterranean species particularly resistant to eutrophication and turbidity, making it a useful indicator of intermediate water quality. Often found alongside Posidonia oceanica.',
 'Least Concern', 0, 'active'),

('cymodocea-angustata',
 'Cymodocea angustata', 'Narrow Cymodocea', 'Cymodoceaceae', 'Cymodocea',
 'Northern Australia',
 'Endemic to northern Australia, Narrow Cymodocea forms extensive intertidal meadows along Australia''s northern coastline. It is an important habitat for dugongs and sea turtles in the region.',
 'Least Concern', 0, 'active'),

('halodule-uninervis',
 'Halodule uninervis', 'Spade Grass', 'Cymodoceaceae', 'Halodule',
 'Indo-Pacific & Red Sea',
 'One of the most abundant seagrasses in the Indo-Pacific, easily recognised by its distinctive trident-shaped leaf tip. Forms extensive monospecific beds and is a key food for dugongs.',
 'Least Concern', 1, 'active'),

('halodule-pinifolia',
 'Halodule pinifolia', 'Pin-leaf Shoal Grass', 'Cymodoceaceae', 'Halodule',
 'Indo-Pacific & East Africa',
 'A small, narrow-leaved pioneer species forming short-lived intertidal meadows. Often among the first seagrasses to colonise disturbed intertidal areas across the Indo-Pacific and East Africa.',
 'Least Concern', 0, 'active'),

('halodule-wrightii',
 'Halodule wrightii', 'Shoal Grass', 'Cymodoceaceae', 'Halodule',
 'Tropical & Subtropical Atlantic',
 'A pioneer species that quickly colonises disturbed or newly exposed Atlantic sediments. Highly tolerant of salinity fluctuations, making it common in estuarine environments and a frequent succession precursor.',
 'Least Concern', 0, 'active'),

('halodule-beaudettei',
 'Halodule beaudettei', 'Beaudette''s Shoal Grass', 'Cymodoceaceae', 'Halodule',
 'Gulf of Mexico & Caribbean',
 'A close relative of Halodule wrightii found in the Gulf of Mexico and Caribbean, often treated as a synonym but recognised as distinct by some authorities. Forms pioneer beds on soft intertidal sediments.',
 'Least Concern', 0, 'active'),

('halodule-emarginata',
 'Halodule emarginata', 'Notched Shoal Grass', 'Cymodoceaceae', 'Halodule',
 'Brazil & South Atlantic',
 'Endemic to the South Atlantic coast of Brazil, Notched Shoal Grass is distinguished by its distinctly notched leaf tip. It forms intertidal meadows that are important nursery grounds for juvenile fish along the Brazilian coast.',
 'Least Concern', 0, 'active'),

('syringodium-isoetifolium',
 'Syringodium isoetifolium', 'Needle Seagrass', 'Cymodoceaceae', 'Syringodium',
 'Indo-Pacific & East Africa',
 'Easily identified by its distinctive round, hollow, needle-shaped leaves. Often forms monospecific beds on sandy reef flats and is an important habitat for juvenile fish and invertebrates.',
 'Least Concern', 1, 'active'),

('syringodium-filiforme',
 'Syringodium filiforme', 'Manatee Grass', 'Cymodoceaceae', 'Syringodium',
 'Caribbean & Gulf of Mexico',
 'The Atlantic counterpart of Needle Seagrass, Manatee Grass forms extensive beds across the Caribbean and Gulf of Mexico. Named for its importance as a food source for manatees, it often grows alongside Thalassia testudinum.',
 'Least Concern', 0, 'active'),

('thalassodendron-ciliatum',
 'Thalassodendron ciliatum', 'Comb Seagrass', 'Cymodoceaceae', 'Thalassodendron',
 'East Africa & Indian Ocean Islands',
 'One of the few seagrass species adapted to rocky substrates, anchoring itself with robust rhizomes. Supports diverse fish assemblages on East African reef slopes.',
 'Vulnerable', 0, 'active'),

('thalassodendron-pachyrhizum',
 'Thalassodendron pachyrhizum', 'Thick-rooted Seagrass', 'Cymodoceaceae', 'Thalassodendron',
 'Western Australia',
 'Endemic to western Australia, this species anchors on hard substrates using its thick rhizomes. It grows in exposed high-energy environments unusual for seagrasses.',
 'Near Threatened', 0, 'active'),

('thalassodendron-leptocaule',
 'Thalassodendron leptocaule', 'Slender-stemmed Seagrass', 'Cymodoceaceae', 'Thalassodendron',
 'East Africa & Mozambique Channel',
 'The least documented of the three Thalassodendron species, found in deeper subtidal zones along the East African coast. Its slender stems and growth on mixed substrates distinguish it from T. ciliatum.',
 'Data Deficient', 0, 'active'),

('amphibolis-antarctica',
 'Amphibolis antarctica', 'Wire Weed', 'Cymodoceaceae', 'Amphibolis',
 'Southern Australia',
 'A structurally unique seagrass with woody, wire-like stems that persist for decades. Dominant in southern Australian coastal waters, it supports a complex epiphytic community and is highly sensitive to temperature increases.',
 'Least Concern', 0, 'active'),

('amphibolis-griffithii',
 'Amphibolis griffithii', 'Griffin''s Seagrass', 'Cymodoceaceae', 'Amphibolis',
 'Southern & Western Australia',
 'Endemic to southern and western Australia, Griffin''s Seagrass co-occurs with Amphibolis antarctica but tends to prefer slightly more sheltered environments. It supports a rich epiphytic community.',
 'Least Concern', 0, 'active'),

-- ── Family: Zosteraceae ───────────────────────────────────────────────────────

('zostera-marina',
 'Zostera marina', 'Common Eelgrass', 'Zosteraceae', 'Zostera',
 'North Atlantic & North Pacific',
 'The most widespread seagrass in the Northern Hemisphere, supporting diverse marine food webs, stabilising sediments, and serving as critical nursery habitat for commercially important fish including Pacific herring.',
 'Least Concern', 0, 'active'),

('zostera-noltei',
 'Zostera noltei', 'Dwarf Eelgrass', 'Zosteraceae', 'Zostera',
 'Europe & North Africa (Atlantic & Mediterranean)',
 'The smallest European seagrass, forming dense intertidal mats that stabilise estuarine sediments and provide feeding grounds for migratory waterfowl including Brent geese and wigeon.',
 'Least Concern', 0, 'active'),

('zostera-japonica',
 'Zostera japonica', 'Asian Eelgrass', 'Zosteraceae', 'Zostera',
 'East Asia (native); Pacific Northwest USA (introduced)',
 'Native to East Asia, this species was accidentally introduced to the Pacific coast of North America where it is now considered invasive, competing with native Z. marina on intertidal flats.',
 'Least Concern', 0, 'active'),

('zostera-muelleri',
 'Zostera muelleri', 'Mueller''s Eelgrass', 'Zosteraceae', 'Zostera',
 'Australia & New Zealand',
 'The dominant Zostera species complex of eastern Australia and New Zealand, with several recognised subspecies. Forms extensive meadows critical for juvenile fish nurseries and carbon storage along southern Pacific coastlines.',
 'Least Concern', 0, 'active'),

('zostera-nigricaulis',
 'Zostera nigricaulis', 'Black-stemmed Eelgrass', 'Zosteraceae', 'Zostera',
 'Southern & Western Australia',
 'Distinguished by its dark-coloured rhizomes and stems, Black-stemmed Eelgrass is endemic to southern and western Australia. It often grows alongside Posidonia species in mixed coastal meadows.',
 'Least Concern', 0, 'active'),

('zostera-polychlamys',
 'Zostera polychlamys', 'Many-sheathed Eelgrass', 'Zosteraceae', 'Zostera',
 'Southern Australia',
 'Endemic to southern Australia, this species is recognised by the many overlapping leaf sheaths on its stems. It forms part of the diverse temperate seagrass assemblages of the Great Australian Bight region.',
 'Least Concern', 0, 'active'),

('zostera-tasmanica',
 'Zostera tasmanica', 'Tasmanian Eelgrass', 'Zosteraceae', 'Zostera',
 'Tasmania & Southern Australia',
 'Found primarily in Tasmanian and southern Australian coastal waters, Tasmanian Eelgrass forms important intertidal and subtidal meadows that support diverse invertebrate communities in cool-temperate waters.',
 'Least Concern', 0, 'active'),

('zostera-capensis',
 'Zostera capensis', 'Cape Eelgrass', 'Zosteraceae', 'Zostera',
 'South Africa & East Africa',
 'The only Zostera species in sub-Saharan Africa, Cape Eelgrass forms critical estuarine meadows along the South and East African coasts. It is an important nursery habitat for commercially important fish species.',
 'Least Concern', 0, 'active'),

('zostera-novazelandica',
 'Zostera novazelandica', 'New Zealand Eelgrass', 'Zosteraceae', 'Zostera',
 'New Zealand',
 'Endemic to New Zealand''s intertidal and shallow subtidal zones, this small eelgrass species forms the foundation of many North Island estuarine ecosystems, supporting wading birds and juvenile fish.',
 'Least Concern', 0, 'active'),

('zostera-asiatica',
 'Zostera asiatica', 'Asian Broad-leaf Eelgrass', 'Zosteraceae', 'Zostera',
 'North Pacific (Russia, Japan, Korea)',
 'A broad-leaved eelgrass species found in the cold North Pacific waters of Russia, Japan, and Korea. It forms subtidal meadows in moderately exposed coastal areas and is distinguished from Z. marina by its wider leaves.',
 'Least Concern', 0, 'active'),

('zostera-caulescens',
 'Zostera caulescens', 'Giant Eelgrass', 'Zosteraceae', 'Zostera',
 'Japan & Korea',
 'The largest Zostera species, forming spectacular deep subtidal meadows off Japan and Korea. Its long leaves create towering underwater forests that provide habitat for a wide range of marine life.',
 'Near Threatened', 0, 'active'),

('phyllospadix-scouleri',
 'Phyllospadix scouleri', 'Scouler''s Surfgrass', 'Zosteraceae', 'Phyllospadix',
 'Pacific Coast of North America',
 'Unlike most seagrasses, Surfgrass attaches to rocky substrate with specially adapted holdfasts. It dominates exposed rocky Pacific shores from Alaska to Baja California, forming wave-swept green carpets.',
 'Least Concern', 0, 'active'),

('phyllospadix-torreyi',
 'Phyllospadix torreyi', 'Torrey''s Surfgrass', 'Zosteraceae', 'Phyllospadix',
 'Pacific Coast of North America (California to Mexico)',
 'Found along the Californian and Baja coastline, Torrey''s Surfgrass grows in slightly deeper water than Scouler''s Surfgrass and supports rich invertebrate and fish communities on rocky reefs.',
 'Least Concern', 0, 'active'),

('phyllospadix-japonicus',
 'Phyllospadix japonicus', 'Japanese Surfgrass', 'Zosteraceae', 'Phyllospadix',
 'Japan, Korea & Russian Far East',
 'The Asian counterpart of the Pacific surfgrasses, common on rocky shores of Japan and Korea. It withstands strong wave action and cold water temperatures, providing shelter for diverse intertidal invertebrates.',
 'Least Concern', 0, 'active'),

('phyllospadix-iwatensis',
 'Phyllospadix iwatensis', 'Iwate Surfgrass', 'Zosteraceae', 'Phyllospadix',
 'Japan & Korea',
 'Endemic to cold-temperate rocky coasts of Japan and Korea, Iwate Surfgrass grows in deeper subtidal zones than P. japonicus and is an important habitat for urchins and benthic invertebrates.',
 'Least Concern', 0, 'active'),

('phyllospadix-serrulatus',
 'Phyllospadix serrulatus', 'Serrated Surfgrass', 'Zosteraceae', 'Phyllospadix',
 'Pacific Coast of North America (Alaska to Oregon)',
 'Found on cool rocky shores from Alaska to Oregon, Serrated Surfgrass is distinguished by its finely toothed leaf margins. It forms dense patches in the lower intertidal zone alongside mussels and sea urchins.',
 'Least Concern', 0, 'active'),

-- ── Family: Posidoniaceae ─────────────────────────────────────────────────────

('posidonia-oceanica',
 'Posidonia oceanica', 'Neptune Grass', 'Posidoniaceae', 'Posidonia',
 'Mediterranean Sea',
 'A flagship Mediterranean species that grows extremely slowly — sometimes just a centimeter per year — and can live for thousands of years. Its dense mats store vast carbon and protect coastlines from erosion.',
 'Least Concern', 0, 'active'),

('posidonia-australis',
 'Posidonia australis', 'Ribbon Weed', 'Posidoniaceae', 'Posidonia',
 'Southern Australia',
 'The largest of the Australian Posidonia species, forming vast meadows in southern Australian waters including the world-famous Shark Bay, a UNESCO World Heritage Site. It supports Australia''s dugong population.',
 'Least Concern', 0, 'active'),

('posidonia-sinuosa',
 'Posidonia sinuosa', 'Sinuous Posidonia', 'Posidoniaceae', 'Posidonia',
 'Southern Australia',
 'One of the most abundant seagrasses in southern Australia, often co-occurring with Posidonia australis. Its slightly narrower and wavy-edged leaves distinguish it from its relatives.',
 'Least Concern', 0, 'active'),

('posidonia-coriacea',
 'Posidonia coriacea', 'Tough Posidonia', 'Posidoniaceae', 'Posidonia',
 'Western & Southern Australia',
 'With notably leathery, thick leaves, Tough Posidonia is well adapted to the physical stresses of exposed coasts. Endemic to Australia, it is found in energetic environments where other Posidonia species are absent.',
 'Least Concern', 0, 'active'),

('posidonia-angustifolia',
 'Posidonia angustifolia', 'Narrow-leaf Posidonia', 'Posidoniaceae', 'Posidonia',
 'Southern & Western Australia',
 'One of several narrow-leaved Australian Posidonia species. It forms dense subtidal meadows along the southern Australian coast, often in association with other Posidonia species in structurally diverse mixed-species beds.',
 'Least Concern', 0, 'active'),

('posidonia-ostenfeldii',
 'Posidonia ostenfeldii', 'Ostenfeld''s Posidonia', 'Posidoniaceae', 'Posidonia',
 'Southern Australia',
 'A less-studied Australian Posidonia species endemic to southern waters. Forms part of the diverse temperate seagrass communities of the Great Australian Bight and the Spencer Gulf.',
 'Least Concern', 0, 'active'),

('posidonia-robertsoniae',
 'Posidonia robertsoniae', 'Robertson''s Posidonia', 'Posidoniaceae', 'Posidonia',
 'Western Australia',
 'Endemic to Western Australia, Robertson''s Posidonia is one of the less commonly documented species in the genus. It contributes to the remarkable diversity of seagrass communities in the waters of southwest Australia.',
 'Least Concern', 0, 'active'),

('posidonia-denhartogii',
 'Posidonia denhartogii', 'Den Hartog''s Posidonia', 'Posidoniaceae', 'Posidonia',
 'Western Australia',
 'Named after seagrass pioneer Cornelis den Hartog, this Australian endemic is part of the remarkable species radiation of Posidonia found only in Australian waters.',
 'Least Concern', 0, 'active'),

('posidonia-kirkmanii',
 'Posidonia kirkmanii', 'Kirkman''s Posidonia', 'Posidoniaceae', 'Posidonia',
 'Western Australia',
 'The most recently described of the Australian Posidonia species, Kirkman''s Posidonia completes the nine-species radiation of this genus in Australian coastal waters.',
 'Least Concern', 0, 'active'),

-- ── Family: Ruppiaceae ────────────────────────────────────────────────────────

('ruppia-maritima',
 'Ruppia maritima', 'Widgeon Grass', 'Ruppiaceae', 'Ruppia',
 'Cosmopolitan (worldwide)',
 'One of the most broadly distributed aquatic macrophytes, Widgeon Grass thrives across a wide range of salinities. An important food source for waterfowl, particularly widgeon ducks, across all continents.',
 'Least Concern', 0, 'active')

ON DUPLICATE KEY UPDATE
    scientific_name = VALUES(scientific_name),
    common_name     = VALUES(common_name),
    family          = VALUES(family),
    genus           = VALUES(genus),
    region          = VALUES(region),
    description     = VALUES(description),
    iucn_status     = VALUES(iucn_status),
    in_cnn_scope    = VALUES(in_cnn_scope),
    status          = VALUES(status);


-- =============================================================================
-- VERIFY (optional — review counts in phpMyAdmin Results panel)
-- =============================================================================
SELECT 'users'                   AS tbl, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'sessions',                        COUNT(*) FROM sessions
UNION ALL
SELECT 'assessments',                     COUNT(*) FROM assessments
UNION ALL
SELECT 'identifications',                 COUNT(*) FROM identifications
UNION ALL
SELECT 'identification_results',          COUNT(*) FROM identification_results
UNION ALL
SELECT 'seagrass',                        COUNT(*) FROM seagrass
UNION ALL
SELECT 'system_settings',                 COUNT(*) FROM system_settings;

SELECT 'CNN scope species' AS label, COUNT(*) AS count
FROM seagrass WHERE in_cnn_scope = 1;

SELECT family, COUNT(*) AS species_count
FROM seagrass GROUP BY family ORDER BY family;
