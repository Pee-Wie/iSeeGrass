<?php
/**
 * Migration 012 — Create flagged_predictions table
 *
 * Stores user-submitted flags when a model prediction appears wrong.
 * Feeds back into the model retraining pipeline (status: accepted).
 *
 * Run once against the target database:
 *   php core/migrations/012_flagged_predictions.php
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDB();

$pdo->exec("
    CREATE TABLE IF NOT EXISTS flagged_predictions (
        id                  INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
        identification_id   INT UNSIGNED        NULL
                            COMMENT 'FK → identifications.id; NULL for guest submissions',
        user_id             INT UNSIGNED        NULL
                            COMMENT 'FK → users.id; NULL for guest submissions',
        image_filename      VARCHAR(255)        NULL
                            COMMENT 'Copied from identifications.image_filename at flag time',
        model_prediction    VARCHAR(120)        NOT NULL
                            COMMENT 'Top result label CREYNet returned',
        model_confidence    DECIMAL(5,2)        NULL
                            COMMENT 'Confidence percentage at time of prediction',
        user_correction     VARCHAR(120)        NULL
                            COMMENT 'What the user says the species actually is (optional)',
        notes               TEXT                NULL
                            COMMENT 'Free-form notes from the user',
        status              ENUM('pending','reviewed','accepted','rejected')
                            NOT NULL DEFAULT 'pending'
                            COMMENT 'Admin review workflow state',
        created_at          TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_fp_status           (status),
        INDEX idx_fp_user             (user_id),
        INDEX idx_fp_identification   (identification_id),
        INDEX idx_fp_prediction       (model_prediction(40)),

        CONSTRAINT fk_fp_identification
            FOREIGN KEY (identification_id)
            REFERENCES identifications(id)
            ON DELETE SET NULL,

        CONSTRAINT fk_fp_user
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE SET NULL

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='User-submitted wrong-prediction flags for model improvement';
");

echo "Migration 012: flagged_predictions table created.\n";
