package com.iseegrass.native_app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.Manifest;
import android.os.Bundle;
import android.view.View;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.iseegrass.native_app.databinding.ActivitySplashBinding;
import com.iseegrass.native_app.model.MeResponse;
import com.iseegrass.native_app.network.ApiClient;
import com.iseegrass.native_app.network.UserSessionManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Entry point. Shows the splash screen and checks whether the user is already
 * logged in.
 *
 * Auth check strategy:
 *  1. Try GET /api/auth/me (network) — if it succeeds, go to MainActivity.
 *  2. If network fails but a cached user exists (logged in before), go to
 *     MainActivity anyway so the user can see the UI (offline mode).
 *  3. If no cached user, go to LoginActivity.
 */
public class SplashActivity extends AppCompatActivity {

    private static final String PERMISSION_PREFERENCES = "first_launch_permissions";
    private static final String PERMISSION_PROMPTED = "prompted";

    private ActivitySplashBinding binding;
    private ActivityResultLauncher<String[]> permissionLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        permissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                result -> {
                    markPermissionPrompted();
                    continueStartup();
                });
        binding = ActivitySplashBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.btnGetStarted.setOnClickListener(v -> checkAuth());
        SharedPreferences preferences = getSharedPreferences(
                PERMISSION_PREFERENCES, MODE_PRIVATE);
        if (preferences.getBoolean(PERMISSION_PROMPTED, false)) {
            continueStartup();
        } else {
            showFirstLaunchPermissionPrompt();
        }
    }

    private void showFirstLaunchPermissionPrompt() {
        binding.btnGetStarted.setEnabled(false);
        new android.app.AlertDialog.Builder(this)
                .setTitle("Camera and location access")
                .setMessage("Camera access lets you take identification photos. Location can add "
                        + "coordinates when a photo has no GPS data. You can choose existing "
                        + "photos with the system picker without granting gallery access.")
                .setPositiveButton("Continue", (dialog, which) ->
                        permissionLauncher.launch(new String[]{
                                Manifest.permission.CAMERA,
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                                Manifest.permission.ACCESS_FINE_LOCATION
                        }))
                .setNegativeButton("Not now", (dialog, which) -> {
                    markPermissionPrompted();
                    continueStartup();
                })
                .setOnCancelListener(dialog -> {
                    markPermissionPrompted();
                    continueStartup();
                })
                .show();
    }

    private void markPermissionPrompted() {
        getSharedPreferences(PERMISSION_PREFERENCES, MODE_PRIVATE)
                .edit()
                .putBoolean(PERMISSION_PROMPTED, true)
                .apply();
    }

    private void continueStartup() {
        binding.btnGetStarted.setEnabled(true);
        if (UserSessionManager.get(this).shouldRememberLogin()) {
            checkAuth();
        }
    }

    private void checkAuth() {
        binding.btnGetStarted.setEnabled(false);
        binding.progressBar.setVisibility(View.VISIBLE);

        if (!UserSessionManager.get(this).shouldRememberLogin()) {
            goTo(LoginActivity.class);
            return;
        }

        ApiClient.getInstance(this)
                .getApiService()
                .getMe()
                .enqueue(new Callback<MeResponse>() {
                    @Override
                    public void onResponse(Call<MeResponse> call,
                                           Response<MeResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            // Network session valid — update cached user
                            UserSessionManager.get(SplashActivity.this)
                                    .saveUser(response.body().getUser());
                            goTo(MainActivity.class);
                        } else {
                            // Session expired — go to login
                            goTo(LoginActivity.class);
                        }
                    }

                    @Override
                    public void onFailure(Call<MeResponse> call, Throwable t) {
                        // Network unavailable — fall back to cached user
                        if (UserSessionManager.get(SplashActivity.this).isLoggedIn()) {
                            // Has logged in before — allow into app (offline mode)
                            goTo(MainActivity.class);
                        } else {
                            // Never logged in — must go to login screen
                            goTo(LoginActivity.class);
                        }
                    }
                });
    }

    private void goTo(Class<?> target) {
        startActivity(new Intent(this, target));
        finish();
    }
}
