<?php

require_once __DIR__ . '/../config/env.php';

final class IdentificationImageStorage
{
    private const FILENAME_PATTERN = '/^[a-f0-9]{32}\.(jpg|png|webp)$/';

    public static function directory(): string
    {
        $storagePath = trim((string) env('IDENTIFICATION_STORAGE_DIR', ''));
        $volumePath = trim((string) env('RAILWAY_VOLUME_MOUNT_PATH', ''));
        $isRailway = env('RAILWAY_ENVIRONMENT') !== null || env('RAILWAY_PROJECT_ID') !== null;

        if ($storagePath !== '') {
            $directory = $storagePath;
            $realDirectory = realpath($directory);
            if ($realDirectory === false || !is_dir($realDirectory) || !is_writable($realDirectory)) {
                throw new RuntimeException('Configured identification image storage is unavailable or not writable.');
            }
            return $realDirectory;
        }

        if ($isRailway) {
            $candidates = array_filter([
                $volumePath,
                '/var/www/html/www/public/uploads',
                dirname(__DIR__, 2) . '/www/public/uploads',
            ]);
            foreach ($candidates as $candidate) {
                $realDirectory = realpath($candidate);
                if ($realDirectory !== false && is_dir($realDirectory) && is_writable($realDirectory)) {
                    return $realDirectory;
                }
            }
            throw new RuntimeException('Railway identification volume is unavailable or not writable.');
        } elseif ($volumePath !== '') {
            $directory = $volumePath;
        } else {
            $directory = dirname(__DIR__, 2) . '/www/public/uploads/identifications';
            if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
                throw new RuntimeException('Could not create the local identification image directory.');
            }
        }

        $realDirectory = realpath($directory);
        if ($realDirectory === false || !is_dir($realDirectory) || !is_writable($realDirectory)) {
            throw new RuntimeException('Identification image storage is unavailable or not writable.');
        }

        return $realDirectory;
    }

    public static function path(string $filename): string
    {
        if (!preg_match(self::FILENAME_PATTERN, $filename)) {
            throw new InvalidArgumentException('Invalid identification image filename.');
        }

        return self::directory() . DIRECTORY_SEPARATOR . $filename;
    }

    public static function imageUrl(string $filename): string
    {
        self::path($filename);
        return '/api/identifications/image?filename=' . rawurlencode($filename);
    }

    public static function findExisting(string $filename): ?string
    {
        $path = self::path($filename);
        if (is_file($path)) {
            return $path;
        }

        $legacyPath = dirname(__DIR__, 2)
            . '/www/public/uploads/identifications/' . $filename;

        return is_file($legacyPath) ? $legacyPath : null;
    }

    public static function storeUploaded(array $file, string $extension): string
    {
        $filename = bin2hex(random_bytes(16)) . '.' . $extension;
        $destination = self::path($filename);

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException('Failed to store the uploaded identification image.');
        }

        return $filename;
    }
}
