<?php
/**
 * core/app/models/SessionModel.php
 *
 * Data-access layer for the `sessions` table.
 * Sessions are server-side: the token in the HttpOnly cookie is the PK.
 */

class SessionModel
{
    public function __construct(private PDO $pdo) {}

    /**
     * Create a new session row and return the token.
     *
     * @param int    $userId      User ID this session belongs to.
     * @param int    $lifetimeSec How many seconds until the session expires.
     * @param string $token       Pre-generated token (from generateSessionToken()).
     */
    public function create(int $userId, int $lifetimeSec, string $token): string
    {
        $ip        = $_SERVER['REMOTE_ADDR']     ?? null;
        $ua        = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $expiresAt = date('Y-m-d H:i:s', time() + $lifetimeSec);

        $stmt = $this->pdo->prepare(
            'INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at)
             VALUES (:id, :user_id, :ip, :ua, :expires_at)'
        );
        $stmt->execute([
            ':id'         => $token,
            ':user_id'    => $userId,
            ':ip'         => $ip ? substr($ip, 0, 45) : null,
            ':ua'         => $ua ? substr($ua, 0, 255) : null,
            ':expires_at' => $expiresAt,
        ]);

        return $token;
    }

    /**
     * Look up a valid (non-expired) session by its token.
     * Returns the session row (including user_id) or null if missing/expired.
     */
    public function find(string $token): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM sessions
              WHERE id = :id
                AND expires_at > NOW()
              LIMIT 1'
        );
        $stmt->execute([':id' => $token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Delete a session by token (logout).
     */
    public function delete(string $token): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM sessions WHERE id = :id');
        $stmt->execute([':id' => $token]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Delete all sessions belonging to a user (force-logout all devices).
     */
    public function deleteAllForUser(int $userId): int
    {
        $stmt = $this->pdo->prepare('DELETE FROM sessions WHERE user_id = :uid');
        $stmt->execute([':uid' => $userId]);
        return (int) $stmt->rowCount();
    }

    /**
     * Purge expired session rows. Call on each login to keep the table lean.
     */
    public function purgeExpired(): int
    {
        $stmt = $this->pdo->prepare('DELETE FROM sessions WHERE expires_at <= NOW()');
        $stmt->execute();
        return (int) $stmt->rowCount();
    }
}
