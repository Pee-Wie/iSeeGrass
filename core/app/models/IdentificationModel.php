<?php
/**
 * core/app/models/IdentificationModel.php
 *
 * Data-access layer for `identifications` + `identification_results`.
 */

class IdentificationModel
{
    public function __construct(private PDO $pdo) {}

    // ── Identifications ───────────────────────────────────────────────────────

    /**
     * Create an identification run record. Returns the new ID.
     *
     * @param int         $userId        Who ran the identification.
     * @param int         $imageCount    Number of images submitted.
     * @param string|null $topResult     Scientific name of the top prediction.
     * @param float|null  $topConfidence Confidence percent (e.g. 94.75).
     */
    public function create(
        int     $userId,
        int     $imageCount    = 1,
        ?string $topResult     = null,
        ?float  $topConfidence = null
    ): int {
        $stmt = $this->pdo->prepare(
            'INSERT INTO identifications (user_id, image_count, top_result, top_confidence)
             VALUES (:user_id, :image_count, :top_result, :top_confidence)'
        );
        $stmt->execute([
            ':user_id'        => $userId,
            ':image_count'    => $imageCount,
            ':top_result'     => $topResult,
            ':top_confidence' => $topConfidence,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Return identification history for one user, newest first.
     */
    public function getByUser(int $userId, int $limit = 20, int $offset = 0): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM identifications
              WHERE user_id = :uid
              ORDER BY created_at DESC
              LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':uid',    $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Find a single identification run by ID.
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT i.*, u.username, u.first_name, u.last_name
               FROM identifications i
               JOIN users u ON u.id = i.user_id
              WHERE i.id = :id
              LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // ── Identification Results ────────────────────────────────────────────────

    /**
     * Insert one prediction result row.
     *
     * @param int    $identificationId  FK → identifications.id
     * @param string $speciesId         Slug matching seagrass_catalog.slug
     * @param string $scientificName
     * @param string|null $commonName
     * @param float  $confidence        Percent (e.g. 87.30)
     * @param int    $rank              1 = top
     */
    public function addResult(
        int     $identificationId,
        string  $speciesId,
        string  $scientificName,
        ?string $commonName,
        float   $confidence,
        int     $rank = 1
    ): int {
        $stmt = $this->pdo->prepare(
            'INSERT INTO identification_results
               (identification_id, species_id, scientific_name, common_name, confidence, rank)
             VALUES
               (:ident_id, :species_id, :scientific_name, :common_name, :confidence, :rank)'
        );
        $stmt->execute([
            ':ident_id'       => $identificationId,
            ':species_id'     => $speciesId,
            ':scientific_name'=> $scientificName,
            ':common_name'    => $commonName,
            ':confidence'     => $confidence,
            ':rank'           => $rank,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Return all result rows for an identification run, ordered by rank.
     */
    public function getResults(int $identificationId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM identification_results
              WHERE identification_id = :ident_id
              ORDER BY rank ASC'
        );
        $stmt->execute([':ident_id' => $identificationId]);
        return $stmt->fetchAll();
    }

    /**
     * Return a full identification record with its result rows attached.
     * Returns null if the identification does not exist.
     */
    public function findWithResults(int $id): ?array
    {
        $ident = $this->findById($id);
        if ($ident === null) {
            return null;
        }
        $ident['results'] = $this->getResults($id);
        return $ident;
    }
}
