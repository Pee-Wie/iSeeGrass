<?php
require_once __DIR__ . '/../../config/cors.php';
/**
 * GET /api/catalog/show?id={catalogId}
 *   OR /api/catalog/show?slug={slug}
 *
 * Returns a single catalog entry. Public (no auth required).
 */

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/models/CatalogModel.php';

setCorsHeaders();
requireMethod('GET');

$pdo          = getDB();
$catalogModel = new CatalogModel($pdo);

if (!empty($_GET['slug'])) {
    $entry = $catalogModel->findBySlug(trim($_GET['slug']));
} elseif (!empty($_GET['id'])) {
    $entry = $catalogModel->findById((int) $_GET['id']);
} else {
    jsonError('Provide id or slug.', 400);
}

if ($entry === null) {
    jsonError('Catalog entry not found.', 404);
}

jsonSuccess($entry);
