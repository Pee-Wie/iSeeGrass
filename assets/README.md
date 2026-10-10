# iSeeGrass — Import the full SEAGRASS_SPECIES dataset

This package expands the existing `seagrass_catalog` table to store the additional fields in the supplied JavaScript dataset, then imports every record from that dataset without manually retyping its descriptions.

## 1. Back up first
Export the existing `iseegrass` database in phpMyAdmin before changing the table.

## 2. Apply the schema migration
In phpMyAdmin, select the `iseegrass` database and import:
`database/migrattion/007_expand_seagrass_catalog.sql`

This migration is intended to run once. It adds:
- `habitat`, `depth`, `leaf_shape`, `leaf_length`, `color`
- `status_color`, `ph_regions` (JSON), `fun_fact`, `tags` (JSON)

## 3. Save the dataset as a file
Save the JavaScript dataset you pasted as a file such as:
`www/public/js/data/species-data.js`

It must contain `export const SEAGRASS_SPECIES = [...]` as in your provided code. The importer does not need the `FAMILIES`, `GENERA`, or `IUCN_STATUSES` exports.

## 4. Install the MySQL driver and run the importer
From the project root, run:

```bash
npm install mysql2
node scripts/import-seagrass-catalog.mjs ./www/public/js/data/species-data.js
```

Adjust the path to the actual location of your dataset file.

Default connection settings are `127.0.0.1`, port `3306`, database `iseegrass`, user `root`, and empty password. If your MySQL setup differs, set environment variables before running the command. Example:

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=iseegrass DB_USER=root DB_PASSWORD='your-password' \
node scripts/import-seagrass-catalog.mjs ./www/public/js/data/species-data.js
```

## CNN scope
The dataset is a global reference catalog, not the list of classes the CNN can currently predict. To avoid accidentally presenting every global species as a model class, the importer marks only the six existing Negros-region species as `in_cnn_scope = 1`. All other entries are imported with `in_cnn_scope = 0`. You can change this policy later after the model's supported classes are confirmed.

## Important
- The importer uses `slug` as the unique key and upserts records. Re-running it updates existing rows instead of creating duplicates.
- It preserves the dataset's descriptive text, IUCN status, region, habitat, depth, leaf morphology, Philippine regions, fun facts, and tags.
- This package imports the dataset exactly as provided; it does not independently validate every taxonomic name or conservation status.
- MySQL/MariaDB must support JSON columns. If using an older version without JSON support, change `ph_regions` and `tags` to `LONGTEXT`.
