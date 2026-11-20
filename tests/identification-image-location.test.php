<?php

require_once __DIR__ . '/../core/helpers/identification_image_location.php';
require_once __DIR__ . '/../core/app/models/IdentificationModel.php';

function assertCoordinates(array $actual, ?float $latitude, ?float $longitude): void
{
    if ($actual['latitude'] !== $latitude || $actual['longitude'] !== $longitude) {
        throw new RuntimeException('Unexpected GPS coordinates: ' . json_encode($actual));
    }
}

$coordinates = IdentificationImageLocation::fromExifData([
    'GPS' => [
        'GPSLatitude' => ['10/1', '30/1', '0/1'],
        'GPSLatitudeRef' => 'S',
        'GPSLongitude' => ['120/1', '15/1', '30/1'],
        'GPSLongitudeRef' => 'W',
    ],
]);
assertCoordinates($coordinates, -10.5, -120.2583333);

assertCoordinates(
    IdentificationImageLocation::fromExifData([
        'GPS' => [
            'GPSLatitude' => ['91/1', '0/1', '0/1'],
            'GPSLatitudeRef' => 'N',
            'GPSLongitude' => ['120/1', '0/1', '0/1'],
            'GPSLongitudeRef' => 'E',
        ],
    ]),
    null,
    null
);

assertCoordinates(IdentificationImageLocation::fromExifData([]), null, null);
$imageCoordinates = IdentificationImageLocation::fromExifData([
    'GPS' => [
        'GPSLatitude' => ['10/1', '30/1', '0/1'],
        'GPSLatitudeRef' => 'S',
        'GPSLongitude' => ['120/1', '15/1', '30/1'],
        'GPSLongitudeRef' => 'W',
    ],
]);
assertCoordinates(
    IdentificationImageLocation::preferImageCoordinates(
        $imageCoordinates,
        14.1234568,
        121.9876543
    ),
    -10.5,
    -120.2583333
);
assertCoordinates(
    IdentificationImageLocation::fromDeviceCoordinates('14.12345678', '121.98765432'),
    14.1234568,
    121.9876543
);
assertCoordinates(
    IdentificationImageLocation::fromDeviceCoordinates('91', '121'),
    null,
    null
);
assertCoordinates(
    IdentificationImageLocation::fromDeviceCoordinates('14.2', 'not-a-coordinate'),
    null,
    null
);

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(
    'CREATE TABLE identifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        image_count INTEGER NOT NULL,
        image_filename TEXT,
        image_path TEXT,
        latitude REAL,
        longitude REAL,
        title TEXT,
        top_result TEXT,
        top_confidence REAL,
        model_type TEXT,
        identification_method TEXT
    )'
);
$model = new IdentificationModel($pdo);
$id = $model->create(
    1,
    1,
    'sample.jpg',
    null,
    'Halophila ovalis',
    null,
    'improved_original',
    'stored.jpg',
    'cnn',
    $coordinates['latitude'],
    $coordinates['longitude']
);
$stored = $pdo->query("SELECT latitude, longitude FROM identifications WHERE id = {$id}")->fetch(PDO::FETCH_ASSOC);
assertCoordinates(
    ['latitude' => (float) $stored['latitude'], 'longitude' => (float) $stored['longitude']],
    -10.5,
    -120.2583333
);

echo "Identification image location tests passed.\n";
