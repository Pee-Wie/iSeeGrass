package com.iseegrass.app.ui.assessment;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.iseegrass.app.R;
import com.iseegrass.app.databinding.FragmentAssessmentBinding;
import com.iseegrass.app.model.Assessment;
import com.iseegrass.app.model.AssessmentsListResponse;
import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.network.ApiClient;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Assessment list screen.
 * - Loads paginated assessments from the API
 * - FAB opens AssessmentEditorActivity to create a new one
 * - Each item taps to edit, delete button removes it
 */
public class AssessmentFragment extends Fragment {

    private FragmentAssessmentBinding binding;
    private AssessmentAdapter adapter;
    private final List<Assessment> assessments = new ArrayList<>();

    private static final int PAGE_LIMIT = 20;
    private int currentPage = 1;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container,
                             Bundle savedInstanceState) {
        binding = FragmentAssessmentBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view,
                               @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        setupRecyclerView();
        setupListeners();
        loadAssessments(true);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Refresh when returning from editor
        loadAssessments(true);
    }

    // ------------------------------------------------------------------ //
    //  Setup                                                              //
    // ------------------------------------------------------------------ //

    private void setupRecyclerView() {
        adapter = new AssessmentAdapter(
                assessments,
                /* onItemClick */ assessment -> openEditor(assessment),
                /* onDeleteClick */ assessment -> confirmDelete(assessment)
        );
        binding.rvAssessments.setLayoutManager(
                new LinearLayoutManager(requireContext()));
        binding.rvAssessments.setAdapter(adapter);

        binding.swipeAssessments.setColorSchemeColors(
                ContextCompat.getColor(requireContext(), R.color.accent));
        binding.swipeAssessments.setOnRefreshListener(() -> loadAssessments(true));
    }

    private void setupListeners() {
        binding.fabNewAssessment.setOnClickListener(v -> openEditor(null));
    }

    // ------------------------------------------------------------------ //
    //  Load                                                               //
    // ------------------------------------------------------------------ //

    private void loadAssessments(boolean reset) {
        if (reset) {
            currentPage = 1;
        }

        ApiClient.getInstance(requireContext())
                .getApiService()
                .getAssessments(currentPage, PAGE_LIMIT)
                .enqueue(new Callback<AssessmentsListResponse>() {
                    @Override
                    public void onResponse(Call<AssessmentsListResponse> call,
                                           Response<AssessmentsListResponse> response) {
                        if (binding == null) return;
                        binding.swipeAssessments.setRefreshing(false);

                        if (response.isSuccessful() && response.body() != null) {
                            List<Assessment> list = response.body().getAssessments();
                            if (reset) assessments.clear();
                            if (list != null) assessments.addAll(list);
                            adapter.notifyDataSetChanged();
                            binding.tvEmpty.setVisibility(
                                    assessments.isEmpty() ? View.VISIBLE : View.GONE);
                        } else {
                            Toast.makeText(requireContext(),
                                    getString(R.string.network_error),
                                    Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<AssessmentsListResponse> call,
                                          Throwable t) {
                        if (binding == null) return;
                        binding.swipeAssessments.setRefreshing(false);
                        Toast.makeText(requireContext(),
                                getString(R.string.network_error),
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Actions                                                            //
    // ------------------------------------------------------------------ //

    private void openEditor(@Nullable Assessment assessment) {
        Intent intent = new Intent(requireContext(), AssessmentEditorActivity.class);
        if (assessment != null) {
            intent.putExtra(AssessmentEditorActivity.EXTRA_ASSESSMENT_ID,
                    assessment.getId());
        }
        startActivity(intent);
    }

    private void confirmDelete(Assessment assessment) {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete, (d, w) -> deleteAssessment(assessment))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void deleteAssessment(Assessment assessment) {
        ApiClient.getInstance(requireContext())
                .getApiService()
                .deleteAssessment(assessment.getId())
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        if (binding == null) return;
                        int idx = assessments.indexOf(assessment);
                        if (idx >= 0) {
                            assessments.remove(idx);
                            adapter.notifyItemRemoved(idx);
                        }
                        binding.tvEmpty.setVisibility(
                                assessments.isEmpty() ? View.VISIBLE : View.GONE);
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        if (binding == null) return;
                        Toast.makeText(requireContext(),
                                getString(R.string.network_error),
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
