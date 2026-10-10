<?php
/**
 * DELETE /api/catalog/delete?id={catalogId}   [Admin only]
 *
 * Hard-delete a catalog entry.
 * Consider setting status = 'inactive' instead to preserve history.
 */

require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../app/middleware/require_admin.php';
require_once __DIR__ . '/../../app/models/CatalogModel.php';

setCorsHeaders();
requireMethod('DELETE');

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    jsonError('Missing or invalid catalog id.', 400);
}

$pdo          = getDB();
$catalogModel = new CatalogModel($pdo);

if ($catalogModel->findById($id) === null) {
    jsonError('Catalog entry not found.', 404);
}

$catalogModel->delete($id);

jsonSuccess(['message' => 'Catalog entry deleted.']);
