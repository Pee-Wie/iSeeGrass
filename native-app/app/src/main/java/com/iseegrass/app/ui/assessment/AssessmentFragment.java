package com.iseegrass.app.ui.assessment;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.snackbar.Snackbar;
import com.iseegrass.app.R;
import com.iseegrass.app.databinding.FragmentAssessmentBinding;
import com.iseegrass.app.model.Assessment;
import com.iseegrass.app.viewmodel.AssessmentViewModel;

import java.util.List;

/**
 * Assessment list screen.
 *
 * <p>Features:
 * <ul>
 *   <li>SwipeRefreshLayout + RecyclerView driven by {@link AssessmentViewModel}</li>
 *   <li>FAB → {@link CreateAssessmentDialog}</li>
 *   <li>Item click → {@link AssessmentEditorActivity}</li>
 *   <li>Delete button → confirm dialog → delete</li>
 *   <li>Swipe-to-delete with 3-second undo Snackbar</li>
 *   <li>onResume reload</li>
 * </ul>
 * </p>
 */
public class AssessmentFragment extends Fragment {

    private FragmentAssessmentBinding binding;
    private AssessmentViewModel viewModel;
    private AssessmentAdapter adapter;

    // ------------------------------------------------------------------ //
    //  Lifecycle                                                          //
    // ------------------------------------------------------------------ //

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

        viewModel = new ViewModelProvider(this).get(AssessmentViewModel.class);

        setupRecyclerView();
        setupSwipeRefresh();
        setupFab();
        observeViewModel();
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadAssessments(requireContext());
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }

    // ------------------------------------------------------------------ //
    //  Setup                                                              //
    // ------------------------------------------------------------------ //

    private void setupRecyclerView() {
        adapter = new AssessmentAdapter(
                /* onItemClick */  assessment -> openEditor(assessment),
                /* onDeleteClick */ assessment -> confirmDelete(assessment)
        );

        // Swipe-to-delete callback
        adapter.setOnSwipeDeleteListener((assessment, position) ->
                showUndoSnackbar(assessment, position));

        binding.rvAssessments.setLayoutManager(
                new LinearLayoutManager(requireContext()));
        binding.rvAssessments.setAdapter(adapter);

        // Attach swipe-to-delete ItemTouchHelper (LEFT swipe only)
        new ItemTouchHelper(new ItemTouchHelper.SimpleCallback(
                0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT) {
            @Override
            public boolean onMove(@NonNull RecyclerView recyclerView,
                                  @NonNull RecyclerView.ViewHolder viewHolder,
                                  @NonNull RecyclerView.ViewHolder target) {
                return false; // no drag-and-drop
            }

            @Override
            public void onSwiped(@NonNull RecyclerView.ViewHolder viewHolder,
                                  int direction) {
                int pos = viewHolder.getAdapterPosition();
                if (pos != RecyclerView.NO_ID) {
                    adapter.onItemSwiped(pos);
                }
            }
        }).attachToRecyclerView(binding.rvAssessments);
    }

    private void setupSwipeRefresh() {
        binding.swipeAssessments.setColorSchemeColors(
                ContextCompat.getColor(requireContext(), R.color.accent));
        binding.swipeAssessments.setOnRefreshListener(
                () -> viewModel.loadAssessments(requireContext()));
    }

    private void setupFab() {
        binding.fabNewAssessment.setOnClickListener(v -> {
            CreateAssessmentDialog dialog = CreateAssessmentDialog.newInstance();
            dialog.show(getChildFragmentManager(), CreateAssessmentDialog.TAG);
        });
    }

    // ------------------------------------------------------------------ //
    //  Observe ViewModel                                                  //
    // ------------------------------------------------------------------ //

    private void observeViewModel() {
        viewModel.listState.observe(getViewLifecycleOwner(), state -> {
            if (binding == null) return;

            if (state instanceof AssessmentViewModel.AssessmentListState.Loading) {
                // SwipeRefresh indicator already visible if triggered by pull;
                // no separate progress bar needed on this screen.

            } else if (state instanceof AssessmentViewModel.AssessmentListState.Success) {
                binding.swipeAssessments.setRefreshing(false);
                List<Assessment> items =
                        ((AssessmentViewModel.AssessmentListState.Success) state).items;
                adapter.setData(items);
                binding.tvEmpty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);

            } else if (state instanceof AssessmentViewModel.AssessmentListState.Error) {
                binding.swipeAssessments.setRefreshing(false);
                // Show error but keep any previously loaded list visible
            }
        });

        // Action state: only care about results from CreateAssessmentDialog creates
        viewModel.actionState.observe(getViewLifecycleOwner(), state -> {
            if (binding == null) return;

            if (state instanceof AssessmentViewModel.AssessmentActionState.Success) {
                // Reload list after a successful create from the dialog
                viewModel.clearActionState();
                viewModel.loadAssessments(requireContext());

            } else if (state instanceof AssessmentViewModel.AssessmentActionState.Error) {
                viewModel.clearActionState();
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Actions                                                            //
    // ------------------------------------------------------------------ //

    private void openEditor(Assessment assessment) {
        Intent intent = new Intent(requireContext(), AssessmentEditorActivity.class);
        intent.putExtra(AssessmentEditorActivity.EXTRA_ASSESSMENT_ID,
                assessment.getId());
        intent.putExtra(AssessmentEditorActivity.EXTRA_TITLE,
                assessment.getTitle());
        intent.putExtra(AssessmentEditorActivity.EXTRA_CONTENT,
                assessment.getContent());
        intent.putExtra(AssessmentEditorActivity.EXTRA_STATUS,
                assessment.getStatus());
        startActivity(intent);
    }

    private void confirmDelete(Assessment assessment) {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete,
                        (d, w) -> viewModel.deleteAssessment(
                                requireContext(), assessment.getId()))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    /**
     * Show an undo Snackbar after a swipe-delete.
     * If the user taps Undo within 3 s the item is re-inserted locally and
     * no server delete is sent. After the Snackbar expires the actual delete
     * is committed to the server.
     */
    private void showUndoSnackbar(Assessment assessment, int position) {
        if (binding == null) return;

        final boolean[] undone = {false};

        Snackbar snackbar = Snackbar.make(
                binding.getRoot(),
                assessment.getTitle() + " deleted",
                3000 /* ms */);

        snackbar.setAction("Undo", v -> {
            undone[0] = true;
            adapter.addItem(position, assessment);
            binding.tvEmpty.setVisibility(View.GONE);
        });

        snackbar.addCallback(new Snackbar.Callback() {
            @Override
            public void onDismissed(Snackbar transientBottomBar, int event) {
                if (!undone[0]) {
                    // Commit the delete to the server
                    viewModel.deleteAssessment(requireContext(), assessment.getId());
                }
            }
        });

        snackbar.show();
    }
}
