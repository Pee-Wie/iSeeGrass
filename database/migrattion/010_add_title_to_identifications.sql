ALTER TABLE identifications
    ADD COLUMN IF NOT EXISTS title VARCHAR(120) DEFAULT NULL
    AFTER image_filename;
