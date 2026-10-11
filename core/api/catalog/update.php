<?php
/**
 * PUT /api/catalog/update?id={catalogId}   [Admin only]
 *
 * Update a catalog entry. Only provided fields are changed.
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/validate.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/CatalogModel.php';

setCorsHeaders();
requireMethod('PUT');

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    jsonError('Missing or invalid catalog id.', 400);
}

$pdo          = getDB();
$catalogModel = new CatalogModel($pdo);

if ($catalogModel->findById($id) === null) {
    jsonError('Catalog entry not found.', 404);
}

$body       = getJsonBody();
$updateData = [];

$allowed = [
    'slug', 'scientific_name', 'common_name', 'family', 'genus',
    'region', 'description', 'iucn_status', 'in_cnn_scope', 'status',
    'ph_regions', 'habitat', 'depth', 'leaf_shape', 'leaf_length',
    'color', 'fun_fact', 'status_color', 'tags',
];

foreach ($allowed as $field) {
    if (array_key_exists($field, $body)) {
        $updateData[$field] = $body[$field];
    }
}

if (empty($updateData)) {
    jsonError('No updatable fields provided.', 422);
}

// Validate slug if changing
if (!empty($updateData['slug'])) {
    $newSlug = trim(strtolower((string) $updateData['slug']));
    if (!preg_match('/^[a-z0-9\-]+$/', $newSlug)) {
        jsonError('Slug may only contain lowercase letters, numbers, and hyphens.', 422);
    }
    $existing = $catalogModel->findBySlug($newSlug);
    if ($existing !== null && (int) $existing['id'] !== $id) {
        jsonError("Slug '{$newSlug}' already exists.", 409);
    }
    $updateData['slug'] = $newSlug;
}

if (isset($updateData['status'])) {
    if ($err = validateEnum($updateData['status'], ['active', 'inactive'], 'Status')) {
        jsonError($err, 422);
    }
}

$catalogModel->update($id, $updateData);
$updated = $catalogModel->findById($id);

jsonSuccess($updated);
