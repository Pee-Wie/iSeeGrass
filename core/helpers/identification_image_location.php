<?php

final class IdentificationImageLocation
{
    /**
     * @return array{latitude: ?float, longitude: ?float}
     */
    public static function fromImage(string $path): array
    {
        if (!function_exists('exif_read_data')) {
            error_log('EXIF support is unavailable; image GPS coordinates were not read.');
            return self::emptyCoordinates();
        }

        $metadata = @exif_read_data($path, 'GPS', true, false);
        return is_array($metadata)
            ? self::fromExifData($metadata)
            : self::emptyCoordinates();
    }

    /**
     * @return array{latitude: ?float, longitude: ?float}
     */
    public static function fromExifData(array $metadata): array
    {
        $gps = $metadata['GPS'] ?? $metadata;
        if (!is_array($gps)) {
            return self::emptyCoordinates();
        }

        $latitude = self::coordinate(
            $gps['GPSLatitude'] ?? null,
            $gps['GPSLatitudeRef'] ?? null,
            'N',
            'S',
            90
        );
        $longitude = self::coordinate(
            $gps['GPSLongitude'] ?? null,
            $gps['GPSLongitudeRef'] ?? null,
            'E',
            'W',
            180
        );

        if ($latitude === null || $longitude === null) {
            return self::emptyCoordinates();
        }

        return ['latitude' => $latitude, 'longitude' => $longitude];
    }

    /**
     * @return array{latitude: ?float, longitude: ?float}
     */
    public static function fromDeviceCoordinates(mixed $latitude, mixed $longitude): array
    {
        if (!is_numeric($latitude) || !is_numeric($longitude)) {
            return self::emptyCoordinates();
        }

        $latitude = (float) $latitude;
        $longitude = (float) $longitude;
        if (!is_finite($latitude) || !is_finite($longitude)
            || $latitude < -90 || $latitude > 90
            || $longitude < -180 || $longitude > 180) {
            return self::emptyCoordinates();
        }

        return [
            'latitude' => round($latitude, 7),
            'longitude' => round($longitude, 7),
        ];
    }

    /**
     * @param array{latitude: ?float, longitude: ?float} $imageCoordinates
     * @return array{latitude: ?float, longitude: ?float}
     */
    public static function preferImageCoordinates(
        array $imageCoordinates,
        mixed $deviceLatitude,
        mixed $deviceLongitude
    ): array {
        if ($imageCoordinates['latitude'] !== null && $imageCoordinates['longitude'] !== null) {
            return $imageCoordinates;
        }

        return self::fromDeviceCoordinates($deviceLatitude, $deviceLongitude);
    }

    private static function coordinate(
        mixed $parts,
        mixed $reference,
        string $positiveReference,
        string $negativeReference,
        float $maximum
    ): ?float {
        if (!is_array($parts) || count($parts) < 3 || !is_string($reference)) {
            return null;
        }

        $degrees = self::rationalToFloat($parts[0]);
        $minutes = self::rationalToFloat($parts[1]);
        $seconds = self::rationalToFloat($parts[2]);
        if ($degrees === null || $minutes === null || $seconds === null
            || $degrees < 0 || $minutes < 0 || $minutes >= 60
            || $seconds < 0 || $seconds >= 60) {
            return null;
        }

        $reference = strtoupper($reference);
        if ($reference !== $positiveReference && $reference !== $negativeReference) {
            return null;
        }

        $decimal = $degrees + ($minutes / 60) + ($seconds / 3600);
        if ($decimal > $maximum) {
            return null;
        }
        if ($reference === $negativeReference) {
            $decimal *= -1;
        }

        return round($decimal, 7);
    }

    private static function rationalToFloat(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return is_finite((float) $value) ? (float) $value : null;
        }
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        $parts = explode('/', trim($value), 2);
        if (!is_numeric($parts[0])) {
            return null;
        }

        $numerator = (float) $parts[0];
        if (count($parts) === 1) {
            return is_finite($numerator) ? $numerator : null;
        }
        if (!is_numeric($parts[1]) || (float) $parts[1] == 0.0) {
            return null;
        }

        $result = $numerator / (float) $parts[1];
        return is_finite($result) ? $result : null;
    }

    /**
     * @return array{latitude: null, longitude: null}
     */
    private static function emptyCoordinates(): array
    {
        return ['latitude' => null, 'longitude' => null];
    }
}
