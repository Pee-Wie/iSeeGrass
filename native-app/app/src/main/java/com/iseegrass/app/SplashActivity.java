package com.iseegrass.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;

import com.iseegrass.app.databinding.ActivitySplashBinding;
import com.iseegrass.app.model.MeResponse;
import com.iseegrass.app.network.ApiClient;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Entry point. Shows the splash screen and checks whether the user is already
 * logged in (session cookie persisted). Navigates to MainActivity if so,
 * LoginActivity otherwise.
 */
public class SplashActivity extends AppCompatActivity {

    private ActivitySplashBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySplashBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.btnGetStarted.setOnClickListener(v -> checkAuth());
    }

    // ------------------------------------------------------------------ //
    //  Auth check                                                         //
    // ------------------------------------------------------------------ //

    private void checkAuth() {
        binding.btnGetStarted.setEnabled(false);
        binding.progressBar.setVisibility(View.VISIBLE);

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
                            goTo(MainActivity.class);
                        } else {
                            goTo(LoginActivity.class);
                        }
                    }

                    @Override
                    public void onFailure(Call<MeResponse> call, Throwable t) {
                        // Network unavailable — send to login; the user can
                        // retry once connectivity is restored.
                        goTo(LoginActivity.class);
                    }
                });
    }

    private void goTo(Class<?> target) {
        startActivity(new Intent(this, target));
        finish();
    }
}
