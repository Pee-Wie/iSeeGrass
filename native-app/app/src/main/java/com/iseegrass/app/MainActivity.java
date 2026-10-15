package com.iseegrass.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.iseegrass.app.databinding.ActivityMainBinding;
import com.iseegrass.app.model.MeResponse;
import com.iseegrass.app.model.User;
import com.iseegrass.app.network.ApiClient;
import com.iseegrass.app.network.Constants;
import com.iseegrass.app.ui.assessment.AssessmentFragment;
import com.iseegrass.app.ui.home.HomeFragment;
import com.iseegrass.app.ui.identify.IdentifyFragment;
import com.iseegrass.app.ui.profile.ProfileFragment;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Shell activity that hosts bottom navigation and swaps fragments.
 * Loads the current user via /api/auth/me on startup to populate the
 * avatar in the toolbar.
 */
public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private User currentUser;

    // Fragment tags
    private static final String TAG_HOME        = "home";
    private static final String TAG_IDENTIFY    = "identify";
    private static final String TAG_ASSESSMENTS = "assessments";
    private static final String TAG_PROFILE     = "profile";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setupBottomNav();
        fetchCurrentUser();

        // Default fragment
        if (savedInstanceState == null) {
            showFragment(TAG_HOME);
            binding.bottomNav.setSelectedItemId(R.id.nav_home);
        }
    }

    // ------------------------------------------------------------------ //
    //  Bottom navigation                                                  //
    // ------------------------------------------------------------------ //

    private void setupBottomNav() {
        binding.bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                showFragment(TAG_HOME);
                return true;
            } else if (id == R.id.nav_identify) {
                showFragment(TAG_IDENTIFY);
                return true;
            } else if (id == R.id.nav_assessments) {
                showFragment(TAG_ASSESSMENTS);
                return true;
            }
            return false;
        });
    }

    private void showFragment(String tag) {
        Fragment existing = getSupportFragmentManager().findFragmentByTag(tag);
        Fragment target;
        if (existing != null) {
            target = existing;
        } else {
            target = createFragment(tag);
        }

        FragmentTransaction tx = getSupportFragmentManager().beginTransaction();

        // Hide all current fragments
        for (Fragment f : getSupportFragmentManager().getFragments()) {
            if (f != null && f.isAdded()) {
                tx.hide(f);
            }
        }

        if (existing != null) {
            tx.show(target);
        } else {
            tx.add(R.id.fragment_container, target, tag);
        }

        tx.commit();
    }

    private Fragment createFragment(String tag) {
        switch (tag) {
            case TAG_IDENTIFY:    return new IdentifyFragment();
            case TAG_ASSESSMENTS: return new AssessmentFragment();
            case TAG_PROFILE:     return new ProfileFragment();
            default:              return new HomeFragment();
        }
    }

    // ------------------------------------------------------------------ //
    //  Auth / current user                                                //
    // ------------------------------------------------------------------ //

    private void fetchCurrentUser() {
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
                            currentUser = response.body().getUser();
                            loadAvatar();
                        } else {
                            // Session expired — redirect to login
                            redirectToLogin();
                        }
                    }

                    @Override
                    public void onFailure(Call<MeResponse> call, Throwable t) {
                        // Network error: stay on current screen, user can retry
                    }
                });
    }

    private void loadAvatar() {
        // No dedicated toolbar avatar view in a simple CoordinatorLayout-based layout,
        // so the avatar click lives on the bottom nav area. If you want a toolbar
        // action, add an ImageView to a custom Toolbar layout and bind it here.
        // For now we pass the user to fragments via getActivity() cast.
    }

    /** Returns the loaded user object so fragments can retrieve it. */
    public User getCurrentUser() {
        return currentUser;
    }

    /** Navigates to ProfileFragment (called from HomeFragment or wherever). */
    public void openProfile() {
        showFragment(TAG_PROFILE);
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    private void redirectToLogin() {
        ApiClient.getInstance(this).getCookieJar().clear();
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
