<?php
/**
 * core/app/models/CatalogModel.php
 *
 * Data-access layer for the `seagrass` table.
 */

class CatalogModel
{
    public function __construct(private PDO $pdo) {}

    // ── Read ─────────────────────────────────────────────────────────────────

    /**
     * Return all catalog entries, optionally filtered.
     *
     * @param array $filters  Keys: status ('active'|'inactive'), in_cnn_scope (0|1),
     *                        search (scientific_name or common_name), region
     */
    public function getAll(array $filters = [], int $limit = 100, int $offset = 0): array
    {
        [$where, $params] = $this->buildFilters($filters);
        $whereClause = $where ? "WHERE {$where}" : '';

        $sql = "SELECT * FROM seagrass
                {$whereClause}
                ORDER BY id ASC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Count entries matching filters.
     */
    public function count(array $filters = []): int
    {
        [$where, $params] = $this->buildFilters($filters);
        $whereClause = $where ? "WHERE {$where}" : '';

        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM seagrass {$whereClause}"
        );
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    /**
     * Find one catalog entry by primary key.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM seagrass WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Find one catalog entry by its slug.
     */
    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM seagrass WHERE slug = :slug LIMIT 1'
        );
        $stmt->execute([':slug' => $slug]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // ── Create ───────────────────────────────────────────────────────────────

    /**
     * Insert a new catalog entry. Returns the new ID.
     *
     * @param array $data  Keys: slug, scientific_name, common_name?, family?, genus?,
     *                     region?, description?, iucn_status?, in_cnn_scope?,
     *                     ph_regions?, habitat?, depth?, leaf_shape?, leaf_length?,
     *                     color?, fun_fact?, status_color?, tags?
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO seagrass
               (slug, scientific_name, common_name, family, genus, region,
                description, iucn_status, in_cnn_scope, status,
                ph_regions, habitat, depth, leaf_shape, leaf_length,
                color, fun_fact, status_color, tags)
             VALUES
               (:slug, :scientific_name, :common_name, :family, :genus, :region,
                :description, :iucn_status, :in_cnn_scope, :status,
                :ph_regions, :habitat, :depth, :leaf_shape, :leaf_length,
                :color, :fun_fact, :status_color, :tags)'
        );
        $stmt->execute([
            ':slug'            => $data['slug'],
            ':scientific_name' => $data['scientific_name'],
            ':common_name'     => $data['common_name']    ?? null,
            ':family'          => $data['family']          ?? null,
            ':genus'           => $data['genus']           ?? null,
            ':region'          => $data['region']          ?? null,
            ':description'     => $data['description']     ?? null,
            ':iucn_status'     => $data['iucn_status']     ?? null,
            ':in_cnn_scope'    => isset($data['in_cnn_scope']) ? (int) $data['in_cnn_scope'] : 0,
            ':status'          => $data['status']          ?? 'active',
            ':ph_regions'      => $data['ph_regions']      ?? null,
            ':habitat'         => $data['habitat']         ?? null,
            ':depth'           => $data['depth']           ?? null,
            ':leaf_shape'      => $data['leaf_shape']      ?? null,
            ':leaf_length'     => $data['leaf_length']     ?? null,
            ':color'           => $data['color']           ?? null,
            ':fun_fact'        => $data['fun_fact']        ?? null,
            ':status_color'    => $data['status_color']    ?? null,
            ':tags'            => $data['tags']            ?? null,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    // ── Update ───────────────────────────────────────────────────────────────

    /**
     * Update a catalog entry. Only keys present in $data are changed.
     */
    public function update(int $id, array $data): bool
    {
        $allowed = [
            'slug', 'scientific_name', 'common_name', 'family', 'genus',
            'region', 'description', 'iucn_status', 'in_cnn_scope', 'status',
            'ph_regions', 'habitat', 'depth', 'leaf_shape', 'leaf_length',
            'color', 'fun_fact', 'status_color', 'tags',
        ];

        $setClauses = [];
        $params     = [':id' => $id];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $setClauses[]      = "{$col} = :{$col}";
                $params[":{$col}"] = $data[$col];
            }
        }

        if (empty($setClauses)) {
            return false;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE seagrass SET ' . implode(', ', $setClauses) . ' WHERE id = :id'
        );
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    /**
     * Hard-delete a catalog entry by ID.
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM seagrass WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function buildFilters(array $filters): array
    {
        $clauses = [];
        $params  = [];

        if (isset($filters['status']) && $filters['status'] !== '') {
            $clauses[]          = 'status = :status';
            $params[':status']  = $filters['status'];
        }
        if (isset($filters['in_cnn_scope']) && $filters['in_cnn_scope'] !== '') {
            $clauses[]               = 'in_cnn_scope = :in_cnn_scope';
            $params[':in_cnn_scope'] = (int) $filters['in_cnn_scope'];
        }
        if (!empty($filters['region'])) {
            $clauses[]          = 'region = :region';
            $params[':region']  = $filters['region'];
        }
        if (!empty($filters['search'])) {
            $clauses[]           = '(scientific_name LIKE :search1 OR common_name LIKE :search2)';
            $params[':search1']  = '%' . $filters['search'] . '%';
            $params[':search2']  = '%' . $filters['search'] . '%';
        }

        return [implode(' AND ', $clauses), $params];
    }
}
