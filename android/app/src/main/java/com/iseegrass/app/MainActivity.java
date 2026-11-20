package com.iseegrass.app;

import android.Manifest;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.CookieManager;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String PERMISSION_PREFERENCES = "first_launch_permissions";
    private static final String PERMISSION_PROMPTED = "prompted";

    private ActivityResultLauncher<String[]> permissionLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        CookieManager.getInstance().setAcceptThirdPartyCookies(getBridge().getWebView(), true);
        permissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                result -> markPermissionPrompted());
        showFirstLaunchPermissionPromptIfNeeded();
    }

    private void showFirstLaunchPermissionPromptIfNeeded() {
        SharedPreferences preferences = getSharedPreferences(
                PERMISSION_PREFERENCES, MODE_PRIVATE);
        if (preferences.getBoolean(PERMISSION_PROMPTED, false)) {
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("Camera and location access")
                .setMessage("Camera access lets you take identification photos. Location can add "
                        + "coordinates when a photo has no GPS data. Choosing existing photos "
                        + "uses the system picker and does not require gallery access.")
                .setPositiveButton("Continue", (dialog, which) ->
                        permissionLauncher.launch(new String[]{
                                Manifest.permission.CAMERA,
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                                Manifest.permission.ACCESS_FINE_LOCATION
                        }))
                .setNegativeButton("Not now", (dialog, which) -> markPermissionPrompted())
                .setOnCancelListener(dialog -> markPermissionPrompted())
                .show();
    }

    private void markPermissionPrompted() {
        getSharedPreferences(PERMISSION_PREFERENCES, MODE_PRIVATE)
                .edit()
                .putBoolean(PERMISSION_PROMPTED, true)
                .apply();
    }
}
