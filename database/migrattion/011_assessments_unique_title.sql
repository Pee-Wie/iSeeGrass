-- ─────────────────────────────────────────────────────────────────────────────
-- 011 — assessments: enforce unique title per user
-- ─────────────────────────────────────────────────────────────────────────────
-- A user cannot have two assessments with the same title.
-- Different users may still share the same title.
-- Run this AFTER resolving any existing duplicate (user_id, title) pairs.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE assessments
    ADD CONSTRAINT uq_assessments_user_title UNIQUE (user_id, title);
