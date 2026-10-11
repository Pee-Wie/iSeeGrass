<?php
/**
 * PHP-based importer for seagrass species data.
 * Parses species-data.js and upserts into the `seagrass` table.
 *
 * Usage:
 *   php import-seagrass-php.php
 */

define('BASE_PATH', '/media/codex/Shared/iSeeGrass');

require_once BASE_PATH . '/core/config/db.php';
$pdo = getDB();

// Read and parse species-data.js
$jsFile = BASE_PATH . '/www/public/js/species-data.js';
$js = file_get_contents($jsFile);
if (!$js) {
    die("Could not read species-data.js\n");
}

// Extract all species objects from the JS array using a hand-rolled parser.
// We'll extract the whole array content between `SEAGRASS_SPECIES = [` and `];`
if (!preg_match('/SEAGRASS_SPECIES\s*=\s*\[(.*)\];/s', $js, $m)) {
    die("Could not extract SEAGRASS_SPECIES array.\n");
}
$arrayContent = $m[1];

// Split into individual species objects by finding `{...},` blocks at the top level.
// We parse character-by-character to respect nested braces.
function splitTopLevelObjects(string $content): array {
    $objects = [];
    $depth = 0;
    $start = null;
    $len = strlen($content);
    for ($i = 0; $i < $len; $i++) {
        $c = $content[$i];
        if ($c === '{') {
            if ($depth === 0) $start = $i;
            $depth++;
        } elseif ($c === '}') {
            $depth--;
            if ($depth === 0 && $start !== null) {
                $objects[] = substr($content, $start, $i - $start + 1);
                $start = null;
            }
        }
    }
    return $objects;
}

$rawObjects = splitTopLevelObjects($arrayContent);

function extractField(string $obj, string $field): ?string {
    // Match: field: "value" or field: 'value'
    if (preg_match('/' . preg_quote($field, '/') . '\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/s', $obj, $m)) {
        return stripslashes($m[1]);
    }
    if (preg_match('/' . preg_quote($field, '/') . "\s*:\s*'((?:[^'\\\\]|\\\\.)*)'\\s*/s", $obj, $m)) {
        return stripslashes($m[1]);
    }
    // Multi-line string concatenation: field:\n  "..." (template literal or continuation)
    if (preg_match('/' . preg_quote($field, '/') . '\s*:\s*"((?:[^"\\\\]|\\\\.)*)"(?:\s*\n\s*"((?:[^"\\\\]|\\\\.)*)")*/', $obj, $m)) {
        return stripslashes($m[1]);
    }
    return null;
}

function extractMultilineString(string $obj, string $field): ?string {
    // Handle: field:\n  "line1"\n  "line2"  — joined strings
    if (preg_match('/' . preg_quote($field, '/') . '\s*:\s*((\"(?:[^"\\\\]|\\\\.)*\"\s*)+)/s', $obj, $m)) {
        // Extract all quoted parts and concatenate
        preg_match_all('/"((?:[^"\\\\]|\\.)*)"/', $m[1], $parts);
        if (!empty($parts[1])) {
            return implode('', array_map('stripslashes', $parts[1]));
        }
    }
    return extractField($obj, $field);
}

function extractArray(string $obj, string $field): ?array {
    if (preg_match('/' . preg_quote($field, '/') . '\s*:\s*\[(.*?)\]/s', $obj, $m)) {
        preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"/', $m[1], $items);
        return $items[1] ?? null;
    }
    return null;
}

$cnnScopeIds = [
    "enhalus-acoroides",
    "thalassia-hemprichii",
    "halophila-ovalis",
    "cymodocea-rotundata",
    "halodule-uninervis",
    "syringodium-isoetifolium",
];

$sql = "
INSERT INTO seagrass (
  slug, scientific_name, common_name, family, genus, region,
  habitat, depth, leaf_shape, leaf_length, color,
  description, fun_fact, iucn_status, status_color, ph_regions, tags,
  in_cnn_scope, status
) VALUES (
  :slug, :scientific_name, :common_name, :family, :genus, :region,
  :habitat, :depth, :leaf_shape, :leaf_length, :color,
  :description, :fun_fact, :iucn_status, :status_color, :ph_regions, :tags,
  :in_cnn_scope, 'active'
)
ON DUPLICATE KEY UPDATE
  scientific_name = VALUES(scientific_name),
  common_name     = VALUES(common_name),
  family          = VALUES(family),
  genus           = VALUES(genus),
  region          = VALUES(region),
  habitat         = VALUES(habitat),
  depth           = VALUES(depth),
  leaf_shape      = VALUES(leaf_shape),
  leaf_length     = VALUES(leaf_length),
  color           = VALUES(color),
  description     = VALUES(description),
  fun_fact        = VALUES(fun_fact),
  iucn_status     = VALUES(iucn_status),
  status_color    = VALUES(status_color),
  ph_regions      = VALUES(ph_regions),
  tags            = VALUES(tags)
";

$stmt = $pdo->prepare($sql);
$imported = 0;
$errors = 0;

foreach ($rawObjects as $obj) {
    $id     = extractField($obj, 'id');
    $sciName = extractField($obj, 'scientificName');
    $common = extractField($obj, 'commonName');
    $family = extractField($obj, 'family');
    $genus  = extractField($obj, 'genus');

    if (!$id || !$sciName) {
        echo "  SKIP: missing id or scientificName in: " . substr($obj, 0, 80) . "\n";
        $errors++;
        continue;
    }

    $region  = extractField($obj, 'region');
    $habitat = extractField($obj, 'habitat');
    $depth   = extractField($obj, 'depth');
    $leafShape = extractField($obj, 'leafShape');
    $leafLength = extractField($obj, 'leafLength');
    $color   = extractField($obj, 'color');
    $desc    = extractMultilineString($obj, 'description');
    $funFact = extractMultilineString($obj, 'funFact');
    $iucn    = extractField($obj, 'iucnStatus');
    $statusColor = extractField($obj, 'statusColor');
    $phRegions = extractArray($obj, 'phRegions');
    $tags      = extractArray($obj, 'tags');

    try {
        $stmt->execute([
            ':slug'          => $id,
            ':scientific_name' => $sciName,
            ':common_name'   => $common,
            ':family'        => $family,
            ':genus'         => $genus,
            ':region'        => $region,
            ':habitat'       => $habitat,
            ':depth'         => $depth,
            ':leaf_shape'    => $leafShape,
            ':leaf_length'   => $leafLength,
            ':color'         => $color,
            ':description'   => $desc,
            ':fun_fact'      => $funFact,
            ':iucn_status'   => $iucn,
            ':status_color'  => $statusColor,
            ':ph_regions'    => $phRegions ? json_encode($phRegions) : null,
            ':tags'          => $tags ? json_encode($tags) : null,
            ':in_cnn_scope'  => in_array($id, $cnnScopeIds) ? 1 : 0,
        ]);
        $imported++;
        echo "  OK: $id\n";
    } catch (PDOException $e) {
        echo "  ERROR for $id: " . $e->getMessage() . "\n";
        $errors++;
    }
}

echo "\nDone. Imported/updated: $imported, Errors: $errors\n";
