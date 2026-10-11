/**
 * One-time / repeatable importer for the project's SEAGRASS_SPECIES dataset.
 *
 * Usage:
 *   npm install mysql2
 *   node scripts/import-seagrass-catalog.mjs ./path/to/species-data.js
 *
 * The source file must export `SEAGRASS_SPECIES` using the syntax shown in the
 * supplied dataset. This script transforms that source in memory, without
 * modifying the original file.
 *
 * Configure with environment variables:
 *   DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=iseegrass
 *   DB_USER=root DB_PASSWORD=...
 *
 * This importer upserts by `slug`, so it can be run again to update records.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

const sourceArg = process.argv[2];
if (!sourceArg) {
  console.error("Usage: node scripts/import-seagrass-catalog.mjs ./path/to/species-data.js");
  process.exit(1);
}

const sourcePath = path.resolve(sourceArg);
let source = await fs.readFile(sourcePath, "utf8");

// Support the provided plain dataset file (`export const SEAGRASS_SPECIES = [...]`)
// by loading a temporary in-memory ES module. No source code is written back.
if (!source.includes("export const SEAGRASS_SPECIES")) {
  console.error("Could not find `export const SEAGRASS_SPECIES` in the source file.");
  process.exit(1);
}
source = source.replace(
  "export const SEAGRASS_SPECIES",
  "const SEAGRASS_SPECIES"
);
source += "\nexport { SEAGRASS_SPECIES };\n";
const moduleUrl = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const datasetModule = await import(moduleUrl);
const speciesList = datasetModule.SEAGRASS_SPECIES;

if (!Array.isArray(speciesList) || speciesList.length === 0) {
  console.error("SEAGRASS_SPECIES is empty or is not an array.");
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "iseegrass",
  charset: "utf8mb4",
});

const sql = `
INSERT INTO seagrass (
  slug, scientific_name, common_name, family, genus, region,
  habitat, depth, leaf_shape, leaf_length, color,
  description, fun_fact, iucn_status, status_color, ph_regions, tags,
  in_cnn_scope, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
ON DUPLICATE KEY UPDATE
  scientific_name = VALUES(scientific_name),
  common_name = VALUES(common_name),
  family = VALUES(family),
  genus = VALUES(genus),
  region = VALUES(region),
  habitat = VALUES(habitat),
  depth = VALUES(depth),
  leaf_shape = VALUES(leaf_shape),
  leaf_length = VALUES(leaf_length),
  color = VALUES(color),
  description = VALUES(description),
  fun_fact = VALUES(fun_fact),
  iucn_status = VALUES(iucn_status),
  status_color = VALUES(status_color),
  ph_regions = VALUES(ph_regions),
  tags = VALUES(tags)
`;

let imported = 0;
try {
  await connection.beginTransaction();
  for (const species of speciesList) {
    if (!species.id || !species.scientificName || !species.family || !species.genus) {
      throw new Error(`Species entry is missing required fields: ${JSON.stringify(species)}`);
    }

    // Preserve the dataset's current CNN-scope policy: the catalog is global,
    // but only the six original Negros species are marked in scope by default.
    const cnnScopeIds = new Set([
      "enhalus-acoroides",
      "thalassia-hemprichii",
      "halophila-ovalis",
      "cymodocea-rotundata",
      "halodule-uninervis",
      "syringodium-isoetifolium",
    ]);

    await connection.execute(sql, [
      species.id,
      species.scientificName,
      species.commonName ?? null,
      species.family ?? null,
      species.genus ?? null,
      species.region ?? null,
      species.habitat ?? null,
      species.depth ?? null,
      species.leafShape ?? null,
      species.leafLength ?? null,
      species.color ?? null,
      species.description ?? null,
      species.funFact ?? null,
      species.iucnStatus ?? null,
      species.statusColor ?? null,
      species.phRegions ? JSON.stringify(species.phRegions) : null,
      species.tags ? JSON.stringify(species.tags) : null,
      cnnScopeIds.has(species.id) ? 1 : 0,
    ]);
    imported += 1;
  }
  await connection.commit();
  console.log(`Successfully imported/updated ${imported} seagrass catalog records.`);
  console.log("Global catalog entries are stored; only the original six species are marked in CNN scope.");
} catch (error) {
  await connection.rollback();
  console.error("Import failed; transaction rolled back.");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
