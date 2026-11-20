package com.iseegrass.native_app.ui.identify;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;
import androidx.exifinterface.media.ExifInterface;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

final class DeviceLocationProvider {

    private static final long MAX_LAST_KNOWN_AGE_NANOS = TimeUnit.MINUTES.toNanos(2);
    private static final ExecutorService EXIF_EXECUTOR = Executors.newSingleThreadExecutor();
    private static final String TAG = "DeviceLocationProvider";

    private DeviceLocationProvider() {}

    static boolean hasPermission(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED;
    }

    static void getExifLocation(Context context, Uri imageUri, Consumer<Location> callback) {
        EXIF_EXECUTOR.execute(() -> {
            Location location = null;
            try (InputStream input = context.getContentResolver().openInputStream(imageUri)) {
                if (input != null) {
                    float[] coordinates = new float[2];
                    if (new ExifInterface(input).getLatLong(coordinates)) {
                        location = new Location("image-exif");
                        location.setLatitude(coordinates[0]);
                        location.setLongitude(coordinates[1]);
                    }
                }
            } catch (IOException exception) {
                Log.w(TAG, "Could not read image GPS metadata.", exception);
            }

            Location result = location;
            ContextCompat.getMainExecutor(context).execute(() -> callback.accept(result));
        });
    }

    static void getCurrentLocation(Context context, Consumer<Location> callback) {
        if (!hasPermission(context)) {
            callback.accept(null);
            return;
        }

        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) {
            callback.accept(null);
            return;
        }

        try {
            boolean hasFineLocation = ContextCompat.checkSelfPermission(
                    context, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED;
            String provider = hasFineLocation && manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    ? LocationManager.GPS_PROVIDER
                    : LocationManager.NETWORK_PROVIDER;
            if (!manager.isProviderEnabled(provider)) {
                callback.accept(null);
                return;
            }

            Location lastKnown = manager.getLastKnownLocation(provider);
            if (isRecent(lastKnown)) {
                callback.accept(lastKnown);
                return;
            }

            LocationManagerCompat.getCurrentLocation(
                    manager,
                    provider,
                    (android.os.CancellationSignal) null,
                    ContextCompat.getMainExecutor(context),
                    callback::accept);
        } catch (SecurityException exception) {
            callback.accept(null);
        }
    }

    private static boolean isRecent(Location location) {
        return location != null
                && SystemClock.elapsedRealtimeNanos() - location.getElapsedRealtimeNanos()
                    <= MAX_LAST_KNOWN_AGE_NANOS;
    }
}
