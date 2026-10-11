<?php
/**
 * core/app/models/UserModel.php
 *
 * Data-access layer for the `users` table.
 * All queries go through PDO prepared statements — no raw interpolation.
 */

class UserModel
{
    public function __construct(private PDO $pdo) {}

    // ── Read ─────────────────────────────────────────────────────────────────

    /**
     * Find a user by their primary key.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Find a user by username (login lookup).
     */
    public function findByUsername(string $username): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users WHERE username = :username LIMIT 1'
        );
        $stmt->execute([':username' => $username]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Find a user by email.
     */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users WHERE email = :email LIMIT 1'
        );
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Return all users with optional filters.
     *
     * @param array $filters  Keys: search (string), position (string), status (string)
     * @param int   $limit
     * @param int   $offset
     */
    public function getAll(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where  = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[]              = '(first_name LIKE :search OR last_name LIKE :search OR email LIKE :search OR username LIKE :search)';
            $params[':search']    = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['position'])) {
            $where[]              = 'position = :position';
            $params[':position']  = $filters['position'];
        }

        if (!empty($filters['status'])) {
            $where[]              = 'status = :status';
            $params[':status']    = $filters['status'];
        }

        if (!empty($filters['exclude_admin'])) {
            $where[] = "role != 'admin'";
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT id, username, email, first_name, last_name, middle_name,
                       position, role, institution, phone, bio, avatar_url,
                       status, created_at, updated_at
                FROM users
                {$whereClause}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->pdo->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * Count users (for pagination), applying the same filters as getAll().
     */
    public function count(array $filters = []): int
    {
        $where  = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[]           = '(first_name LIKE :search OR last_name LIKE :search OR email LIKE :search OR username LIKE :search)';
            $params[':search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['position'])) {
            $where[]              = 'position = :position';
            $params[':position']  = $filters['position'];
        }
        if (!empty($filters['status'])) {
            $where[]           = 'status = :status';
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['exclude_admin'])) {
            $where[] = "role != 'admin'";
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM users {$whereClause}");
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    // ── Create ───────────────────────────────────────────────────────────────

    /**
     * Insert a new user row. Returns the new user's ID.
     *
     * @param array $data  Keys: username, email, password_hash, first_name, last_name,
     *                     middle_name?, position, role?, institution?, phone?, bio?
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users
               (username, email, password_hash, first_name, last_name, middle_name,
                position, role, institution, phone, bio)
             VALUES
               (:username, :email, :password_hash, :first_name, :last_name, :middle_name,
                :position, :role, :institution, :phone, :bio)'
        );

        $stmt->execute([
            ':username'      => $data['username'],
            ':email'         => $data['email'],
            ':password_hash' => $data['password_hash'],
            ':first_name'    => $data['first_name'],
            ':last_name'     => $data['last_name'],
            ':middle_name'   => $data['middle_name']  ?? null,
            ':position'      => $data['position']     ?? 'Researcher',
            ':role'          => $data['role']          ?? 'user',
            ':institution'   => $data['institution']   ?? null,
            ':phone'         => $data['phone']         ?? null,
            ':bio'           => $data['bio']           ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // ── Update ───────────────────────────────────────────────────────────────

    /**
     * Update editable profile fields for a user.
     * Only keys present in $data are updated.
     *
     * @param int   $id    User ID.
     * @param array $data  Fields to update (subset of the editable columns).
     */
    public function update(int $id, array $data): bool
    {
        $allowed = [
            'username', 'first_name', 'last_name', 'middle_name', 'email',
            'position', 'institution', 'phone', 'bio', 'avatar_url', 'status', 'role',
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

        $sql  = 'UPDATE users SET ' . implode(', ', $setClauses) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->rowCount() > 0;
    }

    /**
     * Update a user's password hash.
     */
    public function updatePassword(int $id, string $hash): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET password_hash = :hash WHERE id = :id'
        );
        $stmt->execute([':hash' => $hash, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Promote or demote a user's role (admin only operation).
     */
    public function setRole(int $id, string $role): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE users SET role = :role WHERE id = :id"
        );
        $stmt->execute([':role' => $role, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    /**
     * Hard-delete a user row (cascades sessions, assessments, identifications).
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Return a user array with the password_hash removed — safe to send to the client.
     */
    public static function sanitise(array $user): array
    {
        unset($user['password_hash']);
        return $user;
    }
}
