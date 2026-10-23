<?php
/**
 * core/app/models/AssessmentModel.php
 *
 * Data-access layer for the `assessments` table.
 */

class AssessmentModel
{
    public function __construct(private PDO $pdo) {}

    // ── Read ─────────────────────────────────────────────────────────────────

    /**
     * Find a single assessment by ID.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.*, u.first_name, u.last_name, u.username
               FROM assessments a
               JOIN users u ON u.id = a.user_id
              WHERE a.id = :id
              LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Return assessments visible to a specific user (their own records).
     *
     * @param int   $userId
     * @param array $filters  Keys: status (string), date_from (Y-m-d), date_to (Y-m-d)
     * @param int   $limit
     * @param int   $offset
     */
    public function getByUser(
        int   $userId,
        array $filters = [],
        int   $limit   = 20,
        int   $offset  = 0
    ): array {
        [$where, $params] = $this->buildFilters(
            array_merge($filters, ['user_id' => $userId])
        );

        $sql = "SELECT id, user_id, title, status, created_at, updated_at
                  FROM assessments
                 WHERE {$where}
                 ORDER BY updated_at DESC
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
     * Return all assessments (admin view) with optional filters.
     *
     * @param array $filters  Keys: user_id, status, date_from, date_to, search (title)
     */
    public function getAll(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        [$where, $params] = $this->buildFilters($filters, 'a.');
        $whereClause = $where ? "WHERE {$where}" : '';

        $sql = "SELECT a.id, a.user_id, a.title, a.status, a.created_at, a.updated_at,
                       u.first_name, u.last_name, u.username
                  FROM assessments a
                  JOIN users u ON u.id = a.user_id
                 {$whereClause}
                 ORDER BY a.created_at DESC
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
     * Count assessments matching filters (for pagination).
     */
    public function count(array $filters = []): int
    {
        [$where, $params] = $this->buildFilters($filters, 'a.');
        $whereClause = $where ? "WHERE {$where}" : '';

        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM assessments a {$whereClause}"
        );
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    // ── Uniqueness check ─────────────────────────────────────────────────────

    /**
     * Check whether a title already exists for the given user.
     *
     * @param int      $userId
     * @param string   $title
     * @param int|null $excludeId  Assessment ID to exclude (used on update so the
     *                             current record's own title doesn't trigger a conflict).
     */
    public function titleExistsForUser(int $userId, string $title, ?int $excludeId = null): bool
    {
        $sql    = 'SELECT 1 FROM assessments WHERE user_id = :user_id AND title = :title';
        $params = [':user_id' => $userId, ':title' => $title];

        if ($excludeId !== null) {
            $sql              .= ' AND id != :exclude_id';
            $params[':exclude_id'] = $excludeId;
        }

        $sql .= ' LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return (bool) $stmt->fetchColumn();
    }

    // ── Create ───────────────────────────────────────────────────────────────

    /**
     * Create a new assessment. Returns the new ID.
     */
    public function create(int $userId, string $title, ?string $content = null, string $status = 'draft'): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO assessments (user_id, title, content, status)
             VALUES (:user_id, :title, :content, :status)'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':title'   => $title,
            ':content' => $content,
            ':status'  => $status,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    // ── Update ───────────────────────────────────────────────────────────────

    /**
     * Update an assessment's title, content, and/or status.
     *
     * @param int   $id
     * @param array $data  Keys: title?, content?, status?
     * @param int|null $ownerUserId  If set, also restricts by user_id (ownership check).
     */
    public function update(int $id, array $data, ?int $ownerUserId = null): bool
    {
        $allowed    = ['title', 'content', 'status'];
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

        $ownerClause = '';
        if ($ownerUserId !== null) {
            $ownerClause       = ' AND user_id = :owner_id';
            $params[':owner_id'] = $ownerUserId;
        }

        $sql  = 'UPDATE assessments SET ' . implode(', ', $setClauses)
              . " WHERE id = :id{$ownerClause}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    /**
     * Delete an assessment by ID. Optionally restrict to an owner.
     */
    public function delete(int $id, ?int $ownerUserId = null): bool
    {
        $params      = [':id' => $id];
        $ownerClause = '';

        if ($ownerUserId !== null) {
            $ownerClause           = ' AND user_id = :owner_id';
            $params[':owner_id']   = $ownerUserId;
        }

        $stmt = $this->pdo->prepare(
            "DELETE FROM assessments WHERE id = :id{$ownerClause}"
        );
        $stmt->execute($params);
        return $stmt->rowCount() > 0;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Build a WHERE clause string + params array from a filters array.
     * Returns ['clause', [':param' => value, ...]]
     */
    /**
     * @param string $prefix  Table alias prefix — 'a.' for aliased queries, '' for plain ones.
     */
    private function buildFilters(array $filters, string $prefix = ''): array
    {
        $clauses = [];
        $params  = [];

        if (!empty($filters['user_id'])) {
            $clauses[]          = "{$prefix}user_id = :user_id";
            $params[':user_id'] = (int) $filters['user_id'];
        }
        if (!empty($filters['status'])) {
            $clauses[]          = "{$prefix}status = :status";
            $params[':status']  = $filters['status'];
        }
        if (!empty($filters['date_from'])) {
            $clauses[]            = "DATE({$prefix}created_at) >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $clauses[]          = "DATE({$prefix}created_at) <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }
        if (!empty($filters['search'])) {
            $clauses[]          = "{$prefix}title LIKE :search";
            $params[':search']  = '%' . $filters['search'] . '%';
        }

        return [implode(' AND ', $clauses), $params];
    }
}
