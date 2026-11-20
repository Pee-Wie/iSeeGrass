<?php

require_once __DIR__ . '/../core/helpers/identification_image_storage.php';

$_ENV['IDENTIFICATION_STORAGE_DIR'] = '';
$_ENV['RAILWAY_VOLUME_MOUNT_PATH'] = '';
$_ENV['RAILWAY_ENVIRONMENT'] = 'production';

$expectedDirectory = realpath(__DIR__ . '/../www/public/uploads');
if ($expectedDirectory === false
    || IdentificationImageStorage::directory() !== $expectedDirectory) {
    throw new RuntimeException('Railway fallback must use the mounted public uploads directory.');
}

echo "Identification image storage tests passed.\n";
