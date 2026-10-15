package com.iseegrass.app.ui.assessment;

import android.app.AlertDialog;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.iseegrass.app.R;
import com.iseegrass.app.databinding.ActivityAssessmentEditorBinding;
import com.iseegrass.app.model.Identification;
import com.iseegrass.app.ui.identify.IdentificationAdapter;
import com.iseegrass.app.ui.identify.IdentifyViewModel;
import com.iseegrass.app.viewmodel.AssessmentViewModel;

import java.util.List;

/**
 * Create / edit an Assessment.
 *
 * <p>Pass {@link #EXTRA_ASSESSMENT_ID}, {@link #EXTRA_TITLE}, {@link #EXTRA_CONTENT},
 * and {@link #EXTRA_STATUS} to pre-fill an existing record.
 * Omit (or pass -1 for id) to open a blank create form.</p>
 *
 * <p>Includes an ID History section at the bottom that mirrors the history
 * panel in IdentifyFragment, driven by its own {@link IdentifyViewModel}
 * instance.</p>
 */
public class AssessmentEditorActivity extends AppCompatActivity {

    // ------------------------------------------------------------------ //
    //  Intent extras                                                      //
    // ------------------------------------------------------------------ //

    public static final String EXTRA_ASSESSMENT_ID = "assessment_id";
    public static final String EXTRA_TITLE         = "assessment_title";
    public static final String EXTRA_CONTENT       = "assessment_content";
    public static final String EXTRA_STATUS        = "assessment_status";

    // ------------------------------------------------------------------ //
    //  Status options                                                     //
    // ------------------------------------------------------------------ //

    private static final String[] STATUS_LABELS = {"Draft", "In Progress", "Finalized"};
    private static final String[] STATUS_VALUES = {"draft", "in_progress", "finalized"};

    // ------------------------------------------------------------------ //
    //  State                                                              //
    // ------------------------------------------------------------------ //

    private ActivityAssessmentEditorBinding binding;
    private AssessmentViewModel assessmentViewModel;
    private IdentifyViewModel identifyViewModel;
    private IdentificationAdapter historyAdapter;

    private int assessmentId = -1;
    private int selectedStatusIndex = 0;

    /** Original values captured on load — used for unsaved-changes detection. */
    private String originalTitle   = "";
    private String originalContent = "";
    private String originalStatus  = STATUS_VALUES[0];

    private boolean historyVisible = true;

    // ------------------------------------------------------------------ //
    //  Lifecycle                                                          //
    // ------------------------------------------------------------------ //

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAssessmentEditorBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        assessmentId = getIntent().getIntExtra(EXTRA_ASSESSMENT_ID, -1);

        assessmentViewModel = new ViewModelProvider(this)
                .get(AssessmentViewModel.class);
        identifyViewModel = new ViewModelProvider(this)
                .get(IdentifyViewModel.class);

        setupToolbar();
        setupStatusDropdown();
        setupHistoryList();
        setupClickListeners();
        observeViewModels();
        prefillFromIntent();
    }

    @Override
    protected void onResume() {
        super.onResume();
        identifyViewModel.loadHistory(this);
    }

    // ------------------------------------------------------------------ //
    //  Setup                                                              //
    // ------------------------------------------------------------------ //

    private void setupToolbar() {
        setSupportActionBar(binding.toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle(
                    assessmentId > 0
                            ? getString(R.string.assessments)
                            : getString(R.string.new_assessment));
        }
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());
    }

    private void setupStatusDropdown() {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                this,
                android.R.layout.simple_dropdown_item_1line,
                STATUS_LABELS);
        binding.acvStatus.setAdapter(adapter);
        binding.acvStatus.setText(STATUS_LABELS[selectedStatusIndex], false);
        binding.acvStatus.setOnItemClickListener((parent, view, position, id) ->
                selectedStatusIndex = position);
    }

    private void setupHistoryList() {
        historyAdapter = new IdentificationAdapter();
        historyAdapter.setOnDeleteListener(item -> confirmDeleteHistoryItem(item));

        binding.rvHistory.setLayoutManager(new LinearLayoutManager(this));
        binding.rvHistory.setAdapter(historyAdapter);
        binding.rvHistory.setNestedScrollingEnabled(false);

        // Swipe-to-delete on history items
        new ItemTouchHelper(new ItemTouchHelper.SimpleCallback(
                0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT) {
            @Override
            public boolean onMove(@NonNull RecyclerView rv,
                                  @NonNull RecyclerView.ViewHolder vh,
                                  @NonNull RecyclerView.ViewHolder target) {
                return false;
            }

            @Override
            public void onSwiped(@NonNull RecyclerView.ViewHolder viewHolder,
                                  int direction) {
                int pos = viewHolder.getAdapterPosition();
                if (pos == RecyclerView.NO_ID) return;
                // Grab item from latest list state
                List<Identification> currentItems = getLatestHistoryItems();
                if (currentItems != null && pos < currentItems.size()) {
                    confirmDeleteHistoryItem(currentItems.get(pos));
                } else {
                    historyAdapter.notifyItemChanged(pos);
                }
            }
        }).attachToRecyclerView(binding.rvHistory);
    }

    private void setupClickListeners() {
        binding.btnSave.setOnClickListener(v -> saveAssessment());

        binding.btnToggleHistory.setOnClickListener(v -> {
            historyVisible = !historyVisible;
            binding.rvHistory.setVisibility(historyVisible ? View.VISIBLE : View.GONE);
            binding.btnToggleHistory.setImageResource(
                    historyVisible
                            ? R.drawable.ic_chevron_up
                            : R.drawable.ic_chevron_down);
        });

        binding.btnRetryHistory.setOnClickListener(v -> {
            binding.layoutHistoryError.setVisibility(View.GONE);
            identifyViewModel.loadHistory(this);
        });
    }

    // ------------------------------------------------------------------ //
    //  Prefill from Intent                                                //
    // ------------------------------------------------------------------ //

    private void prefillFromIntent() {
        String title   = getIntent().getStringExtra(EXTRA_TITLE);
        String content = getIntent().getStringExtra(EXTRA_CONTENT);
        String status  = getIntent().getStringExtra(EXTRA_STATUS);

        if (title != null)   binding.etTitle.setText(title);
        if (content != null) binding.etContent.setText(content);

        if (status != null) {
            for (int i = 0; i < STATUS_VALUES.length; i++) {
                if (STATUS_VALUES[i].equals(status)) {
                    selectedStatusIndex = i;
                    binding.acvStatus.setText(STATUS_LABELS[i], false);
                    break;
                }
            }
        }

        // Capture originals for unsaved-changes detection
        originalTitle   = title   != null ? title   : "";
        originalContent = content != null ? content : "";
        originalStatus  = status  != null ? status  : STATUS_VALUES[0];
    }

    // ------------------------------------------------------------------ //
    //  Observe ViewModels                                                 //
    // ------------------------------------------------------------------ //

    private void observeViewModels() {
        // Assessment save / create actions
        assessmentViewModel.actionState.observe(this, state -> {
            if (state instanceof AssessmentViewModel.AssessmentActionState.Loading) {
                showProgress(true);
                binding.btnSave.setEnabled(false);

            } else if (state instanceof AssessmentViewModel.AssessmentActionState.Success) {
                showProgress(false);
                binding.btnSave.setEnabled(true);
                String msg = ((AssessmentViewModel.AssessmentActionState.Success) state).message;
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
                assessmentViewModel.clearActionState();
                setResult(RESULT_OK);
                finish();

            } else if (state instanceof AssessmentViewModel.AssessmentActionState.Error) {
                showProgress(false);
                binding.btnSave.setEnabled(true);
                String msg = ((AssessmentViewModel.AssessmentActionState.Error) state).message;
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
                assessmentViewModel.clearActionState();
            }
        });

        // ID History
        identifyViewModel.historyState.observe(this, state -> {
            if (state instanceof IdentifyViewModel.HistoryState.Loading) {
                binding.layoutHistoryError.setVisibility(View.GONE);

            } else if (state instanceof IdentifyViewModel.HistoryState.Success) {
                binding.layoutHistoryError.setVisibility(View.GONE);
                List<Identification> items =
                        ((IdentifyViewModel.HistoryState.Success) state).items;
                latestHistoryItems = items;
                historyAdapter.setData(items);

            } else if (state instanceof IdentifyViewModel.HistoryState.Error) {
                binding.layoutHistoryError.setVisibility(View.VISIBLE);
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Save                                                               //
    // ------------------------------------------------------------------ //

    private void saveAssessment() {
        String title   = getEditTextValue(binding.etTitle);
        String content = getEditTextValue(binding.etContent);
        String status  = STATUS_VALUES[selectedStatusIndex];

        if (title.isEmpty()) {
            binding.tilTitle.setError(getString(R.string.title) + " is required");
            return;
        }
        binding.tilTitle.setError(null);

        if (assessmentId > 0) {
            assessmentViewModel.updateAssessment(this, assessmentId, title, content, status);
        } else {
            assessmentViewModel.createAssessment(this, title, content, status);
        }
    }

    // ------------------------------------------------------------------ //
    //  Back / unsaved changes                                             //
    // ------------------------------------------------------------------ //

    @Override
    public void onBackPressed() {
        if (hasUnsavedChanges()) {
            new AlertDialog.Builder(this)
                    .setMessage(R.string.unsaved_changes)
                    .setPositiveButton(R.string.discard, (d, w) -> finish())
                    .setNegativeButton(R.string.cancel, null)
                    .show();
        } else {
            super.onBackPressed();
        }
    }

    private boolean hasUnsavedChanges() {
        String currentTitle   = getEditTextValue(binding.etTitle);
        String currentContent = getEditTextValue(binding.etContent);
        String currentStatus  = STATUS_VALUES[selectedStatusIndex];

        return !currentTitle.equals(originalTitle)
                || !currentContent.equals(originalContent)
                || !currentStatus.equals(originalStatus);
    }

    // ------------------------------------------------------------------ //
    //  History helpers                                                    //
    // ------------------------------------------------------------------ //

    /** Latest snapshot received from IdentifyViewModel — used for swipe-to-delete. */
    private List<Identification> latestHistoryItems;

    private List<Identification> getLatestHistoryItems() {
        return latestHistoryItems;
    }

    private void confirmDeleteHistoryItem(Identification item) {
        new AlertDialog.Builder(this)
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete,
                        (d, w) -> identifyViewModel.deleteHistoryItem(this, item.getId()))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    // ------------------------------------------------------------------ //
    //  Utility                                                            //
    // ------------------------------------------------------------------ //

    private void showProgress(boolean show) {
        binding.progressOverlay.setVisibility(show ? View.VISIBLE : View.GONE);
    }

    private String getEditTextValue(android.widget.EditText et) {
        return et.getText() != null ? et.getText().toString().trim() : "";
    }
}
