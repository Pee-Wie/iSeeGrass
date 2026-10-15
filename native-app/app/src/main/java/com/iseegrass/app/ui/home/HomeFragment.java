package com.iseegrass.app.ui.home;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.iseegrass.app.MainActivity;
import com.iseegrass.app.R;
import com.iseegrass.app.databinding.FragmentHomeBinding;
import com.iseegrass.app.model.User;
import com.iseegrass.app.model.AssessmentsListResponse;
import com.iseegrass.app.model.HistoryResponse;
import com.iseegrass.app.network.ApiClient;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Minimal home screen: greeting + quick-action cards for Identify and Assessments.
 */
public class HomeFragment extends Fragment {

    private FragmentHomeBinding binding;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container,
                             Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view,
                               @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Set greeting from current user
        if (getActivity() instanceof MainActivity) {
            User user = ((MainActivity) getActivity()).getCurrentUser();
            if (user != null) {
                String greeting = getString(R.string.greeting, user.getFullName());
                binding.tvGreeting.setText(greeting);
            } else {
                binding.tvGreeting.setText(R.string.app_name);
            }
        }

        // Card click listeners — delegate to BottomNavigationView for clean transitions
        binding.cardIdentify.setOnClickListener(v -> {
            if (getActivity() != null) {
                getActivity().findViewById(R.id.bottom_nav)
                        .performClick(); // won't work directly; use bottom nav selection
                // Better: ask MainActivity
                if (getActivity() instanceof MainActivity) {
                    com.google.android.material.bottomnavigation.BottomNavigationView nav =
                            getActivity().findViewById(R.id.bottom_nav);
                    nav.setSelectedItemId(R.id.nav_identify);
                }
            }
        });

        binding.cardAssessments.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                com.google.android.material.bottomnavigation.BottomNavigationView nav =
                        getActivity().findViewById(R.id.bottom_nav);
                nav.setSelectedItemId(R.id.nav_assessments);
            }
        });

        loadCounts();
    }

    // ------------------------------------------------------------------ //
    //  Load counts                                                        //
    // ------------------------------------------------------------------ //

    private void loadCounts() {
        // ID count
        ApiClient.getInstance(requireContext())
                .getApiService()
                .getHistory(1, 0)
                .enqueue(new Callback<HistoryResponse>() {
                    @Override
                    public void onResponse(Call<HistoryResponse> call,
                                           Response<HistoryResponse> response) {
                        if (binding == null) return;
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().getData() != null) {
                            int total = response.body().getData().getTotal();
                            binding.tvIdCount.setText(
                                    getString(R.string.identifications_count, total));
                        }
                    }

                    @Override
                    public void onFailure(Call<HistoryResponse> call, Throwable t) {
                        // Silently fail; counts are non-critical
                    }
                });

        // Assessment count
        ApiClient.getInstance(requireContext())
                .getApiService()
                .getAssessments(1, 1)
                .enqueue(new Callback<AssessmentsListResponse>() {
                    @Override
                    public void onResponse(Call<AssessmentsListResponse> call,
                                           Response<AssessmentsListResponse> response) {
                        if (binding == null) return;
                        if (response.isSuccessful() && response.body() != null) {
                            int total = response.body().getTotal();
                            binding.tvAssessCount.setText(
                                    getString(R.string.assessments_count, total));
                        }
                    }

                    @Override
                    public void onFailure(Call<AssessmentsListResponse> call, Throwable t) {
                        // Silently fail
                    }
                });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
