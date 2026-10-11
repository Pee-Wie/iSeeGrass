<?php
/**
 * POST /api/catalog/create   [Admin only]
 *
 * Add a new seagrass species entry to the catalog.
 *
 * Request body (JSON):
 *   {
 *     "slug":            "halophila-ovalis",      // required; unique
 *     "scientific_name": "Halophila ovalis",       // required
 *     "common_name":     "Dugong Grass",
 *     "family":          "Hydrocharitaceae",
 *     "genus":           "Halophila",
 *     "region":          "Negros",
 *     "description":     "...",
 *     "iucn_status":     "Least Concern",
 *     "in_cnn_scope":    1,
 *     "status":          "active",
 *     "ph_regions":      "Visayas",
 *     "habitat":         "Shallow coastal",
 *     "depth":           "0-5m",
 *     "leaf_shape":      "Oval",
 *     "leaf_length":     "2-4cm",
 *     "color":           "Green",
 *     "fun_fact":        "...",
 *     "status_color":    "#00cc00",
 *     "tags":            "intertidal,subtidal"
 *   }
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/CatalogModel.php';

setCorsHeaders();
requireMethod('POST');

$body = getJsonBody();

$errors = requireFields($body, ['slug', 'scientific_name']);
if ($errors) {
    jsonError(implode(' ', $errors), 422);
}

// Validate slug format
$slug = trim(strtolower((string) ($body['slug'] ?? '')));
if (!preg_match('/^[a-z0-9\-]+$/', $slug)) {
    jsonError('Slug may only contain lowercase letters, numbers, and hyphens.', 422);
}

$pdo          = getDB();
$catalogModel = new CatalogModel($pdo);

if ($catalogModel->findBySlug($slug) !== null) {
    jsonError("Slug '{$slug}' already exists.", 409);
}

$newId = $catalogModel->create(array_merge($body, ['slug' => $slug]));
$entry = $catalogModel->findById($newId);

jsonSuccess($entry, 201);
