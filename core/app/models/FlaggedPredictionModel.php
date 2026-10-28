<?php
/**
 * core/app/models/FlaggedPredictionModel.php
 *
 * Data-access layer for the `flagged_predictions` table.
 * Records submitted by users (or guests) when a model prediction appears wrong.
 */

class FlaggedPredictionModel
{
    public function __construct(private PDO $pdo) {}

    // ── Create ───────────────────────────────────────────────────────────────

    /**
     * Insert a new flagged-prediction record. Returns the new ID.
     *
     * @param array $data  Keys:
     *   identification_id  int|null   FK → identifications.id
     *   user_id            int|null   FK → users.id
     *   image_filename     string|null
     *   model_prediction   string     What CREYNet returned
     *   model_confidence   float|null Confidence percentage
     *   user_correction    string|null What the user says it actually is
     *   notes              string|null Free-form notes
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO flagged_predictions
               (identification_id, user_id, image_filename,
                model_prediction, model_confidence, user_correction, notes)
             VALUES
               (:identification_id, :user_id, :image_filename,
                :model_prediction, :model_confidence, :user_correction, :notes)'
        );
        $stmt->execute([
            ':identification_id' => $data['identification_id'] ?? null,
            ':user_id'           => $data['user_id']           ?? null,
            ':image_filename'    => $data['image_filename']    ?? null,
            ':model_prediction'  => $data['model_prediction'],
            ':model_confidence'  => isset($data['model_confidence'])
                                        ? (float) $data['model_confidence']
                                        : null,
            ':user_correction'   => $data['user_correction']   ?? null,
            ':notes'             => $data['notes']             ?? null,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    /**
     * Return all flagged predictions, newest first, with optional status filter.
     */
    public function getAll(string $status = '', int $limit = 50, int $offset = 0): array
    {
        $where  = $status !== '' ? 'WHERE fp.status = :status' : '';
        $params = $status !== '' ? [':status' => $status] : [];

        $stmt = $this->pdo->prepare(
            "SELECT fp.*,
                    u.username, u.first_name, u.last_name,
                    i.image_filename AS ident_image_filename
               FROM flagged_predictions fp
               LEFT JOIN users          u  ON u.id  = fp.user_id
               LEFT JOIN identifications i ON i.id  = fp.identification_id
             {$where}
             ORDER BY fp.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Count flagged predictions, optional status filter.
     */
    public function count(string $status = ''): int
    {
        $where  = $status !== '' ? 'WHERE status = :status' : '';
        $params = $status !== '' ? [':status' => $status] : [];
        $stmt   = $this->pdo->prepare(
            "SELECT COUNT(*) FROM flagged_predictions {$where}"
        );
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    /**
     * Update the status of a flagged prediction (admin review workflow).
     */
    public function updateStatus(int $id, string $status): bool
    {
        $allowed = ['pending', 'reviewed', 'accepted', 'rejected'];
        if (!in_array($status, $allowed, true)) return false;

        $stmt = $this->pdo->prepare(
            'UPDATE flagged_predictions SET status = :status WHERE id = :id'
        );
        $stmt->execute([':status' => $status, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Find one flagged prediction by ID.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM flagged_predictions WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Check if an identification run has already been flagged by this user/session.
     * Returns true if a matching record exists.
     */
    public function alreadyFlagged(int $identificationId, ?int $userId): bool
    {
        if ($userId !== null) {
            $stmt = $this->pdo->prepare(
                'SELECT 1 FROM flagged_predictions
                  WHERE identification_id = :ident AND user_id = :uid
                  LIMIT 1'
            );
            $stmt->execute([':ident' => $identificationId, ':uid' => $userId]);
        } else {
            // Guest: just check the identification_id without user scoping
            $stmt = $this->pdo->prepare(
                'SELECT 1 FROM flagged_predictions
                  WHERE identification_id = :ident AND user_id IS NULL
                  LIMIT 1'
            );
            $stmt->execute([':ident' => $identificationId]);
        }
        return (bool) $stmt->fetchColumn();
    }
}
