package com.iseegrass.app.ui.assessment;

import android.app.AlertDialog;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.iseegrass.app.R;
import com.iseegrass.app.databinding.ActivityAssessmentEditorBinding;
import com.iseegrass.app.model.Assessment;
import com.iseegrass.app.model.AssessmentCreateRequest;
import com.iseegrass.app.model.AssessmentDetailResponse;
import com.iseegrass.app.model.AssessmentUpdateRequest;
import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.model.HistoryResponse;
import com.iseegrass.app.model.Identification;
import com.iseegrass.app.network.ApiClient;
import com.iseegrass.app.ui.identify.HistoryAdapter;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Create / edit an Assessment.
 *
 * Pass {@link #EXTRA_ASSESSMENT_ID} to open an existing record for editing.
 * Omit it (or pass -1) to start with a blank create form.
 */
public class AssessmentEditorActivity extends AppCompatActivity {

    public static final String EXTRA_ASSESSMENT_ID = "assessment_id";

    private ActivityAssessmentEditorBinding binding;

    private int assessmentId = -1;
    private Assessment currentAssessment;

    // Status options (values match API)
    private static final String[] STATUS_LABELS = {"Draft", "In Progress", "Finalized"};
    private static final String[] STATUS_VALUES = {"draft", "in_progress", "finalized"};
    private int selectedStatusIndex = 0;

    // History
    private HistoryAdapter historyAdapter;
    private final List<Identification> historyList = new ArrayList<>();
    private boolean historyVisible = true;
    private int historyOffset = 0;
    private static final int HISTORY_LIMIT = 20;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAssessmentEditorBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        assessmentId = getIntent().getIntExtra(EXTRA_ASSESSMENT_ID, -1);

        setupToolbar();
        setupStatusDropdown();
        setupHistoryList();
        setupClickListeners();

        if (assessmentId > 0) {
            loadAssessment();
        }
        loadHistory();
    }

    // ------------------------------------------------------------------ //
    //  Setup                                                              //
    // ------------------------------------------------------------------ //

    private void setupToolbar() {
        setSupportActionBar(binding.toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            String title = assessmentId > 0 ? "Edit Assessment" : "New Assessment";
            getSupportActionBar().setTitle(title);
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

        binding.acvStatus.setOnItemClickListener((parent, view, position, id) -> {
            selectedStatusIndex = position;
        });
    }

    private void setupHistoryList() {
        historyAdapter = new HistoryAdapter(
                historyList,
                /* onDelete */ item -> confirmDeleteHistory(item),
                /* onTitleEdit */ (item, title) -> updateTitle(item, title)
        );
        binding.rvHistory.setLayoutManager(new LinearLayoutManager(this));
        binding.rvHistory.setAdapter(historyAdapter);
    }

    private void setupClickListeners() {
        binding.btnSave.setOnClickListener(v -> saveAssessment());

        binding.btnToggleHistory.setOnClickListener(v -> {
            historyVisible = !historyVisible;
            binding.rvHistory.setVisibility(historyVisible ? View.VISIBLE : View.GONE);
            binding.btnToggleHistory.setImageResource(
                    historyVisible ? R.drawable.ic_chevron_up : R.drawable.ic_chevron_down);
        });

        binding.btnRetryHistory.setOnClickListener(v -> loadHistory());
    }

    // ------------------------------------------------------------------ //
    //  Load existing assessment                                           //
    // ------------------------------------------------------------------ //

    private void loadAssessment() {
        showProgress(true);
        ApiClient.getInstance(this)
                .getApiService()
                .getAssessment(assessmentId)
                .enqueue(new Callback<AssessmentDetailResponse>() {
                    @Override
                    public void onResponse(Call<AssessmentDetailResponse> call,
                                           Response<AssessmentDetailResponse> response) {
                        showProgress(false);
                        if (response.isSuccessful() && response.body() != null
                                && response.body().isSuccess()) {
                            currentAssessment = response.body().getAssessment();
                            populateForm(currentAssessment);
                        }
                    }

                    @Override
                    public void onFailure(Call<AssessmentDetailResponse> call,
                                          Throwable t) {
                        showProgress(false);
                        Toast.makeText(AssessmentEditorActivity.this,
                                getString(R.string.network_error),
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void populateForm(Assessment a) {
        binding.etTitle.setText(a.getTitle());
        binding.etContent.setText(a.getContent());

        for (int i = 0; i < STATUS_VALUES.length; i++) {
            if (STATUS_VALUES[i].equals(a.getStatus())) {
                selectedStatusIndex = i;
                binding.acvStatus.setText(STATUS_LABELS[i], false);
                break;
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Save                                                               //
    // ------------------------------------------------------------------ //

    private void saveAssessment() {
        String title   = getEditText(binding.etTitle);
        String content = getEditText(binding.etContent);
        String status  = STATUS_VALUES[selectedStatusIndex];

        if (title.isEmpty()) {
            binding.tilTitle.setError("Title is required");
            return;
        }
        binding.tilTitle.setError(null);

        showProgress(true);
        binding.btnSave.setEnabled(false);

        if (assessmentId > 0) {
            // Update existing
            AssessmentUpdateRequest req =
                    new AssessmentUpdateRequest(title, content, status);
            ApiClient.getInstance(this)
                    .getApiService()
                    .updateAssessment(assessmentId, req)
                    .enqueue(new Callback<AssessmentDetailResponse>() {
                        @Override
                        public void onResponse(Call<AssessmentDetailResponse> call,
                                               Response<AssessmentDetailResponse> resp) {
                            handleSaveResponse(resp);
                        }

                        @Override
                        public void onFailure(Call<AssessmentDetailResponse> call,
                                              Throwable t) {
                            handleSaveFailure();
                        }
                    });
        } else {
            // Create new
            AssessmentCreateRequest req =
                    new AssessmentCreateRequest(title, content, status);
            ApiClient.getInstance(this)
                    .getApiService()
                    .createAssessment(req)
                    .enqueue(new Callback<AssessmentDetailResponse>() {
                        @Override
                        public void onResponse(Call<AssessmentDetailResponse> call,
                                               Response<AssessmentDetailResponse> resp) {
                            handleSaveResponse(resp);
                        }

                        @Override
                        public void onFailure(Call<AssessmentDetailResponse> call,
                                              Throwable t) {
                            handleSaveFailure();
                        }
                    });
        }
    }

    private void handleSaveResponse(Response<AssessmentDetailResponse> response) {
        showProgress(false);
        binding.btnSave.setEnabled(true);

        if (response.isSuccessful()
                && response.body() != null
                && response.body().isSuccess()) {
            Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show();
            if (assessmentId < 0 && response.body().getAssessment() != null) {
                assessmentId = response.body().getAssessment().getId();
                currentAssessment = response.body().getAssessment();
            } else if (assessmentId < 0) {
                // top-level id field fallback
                assessmentId = response.body().getId();
            }
            setResult(RESULT_OK);
        } else {
            Toast.makeText(this, getString(R.string.network_error),
                    Toast.LENGTH_SHORT).show();
        }
    }

    private void handleSaveFailure() {
        showProgress(false);
        binding.btnSave.setEnabled(true);
        Toast.makeText(this, getString(R.string.network_error),
                Toast.LENGTH_SHORT).show();
    }

    // ------------------------------------------------------------------ //
    //  History                                                            //
    // ------------------------------------------------------------------ //

    private void loadHistory() {
        binding.layoutHistoryError.setVisibility(View.GONE);

        ApiClient.getInstance(this)
                .getApiService()
                .getHistory(HISTORY_LIMIT, historyOffset)
                .enqueue(new Callback<HistoryResponse>() {
                    @Override
                    public void onResponse(Call<HistoryResponse> call,
                                           Response<HistoryResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getData() != null) {
                            List<Identification> records =
                                    response.body().getData().getRecords();
                            if (historyOffset == 0) historyList.clear();
                            if (records != null) {
                                historyList.addAll(records);
                                historyOffset += records.size();
                            }
                            historyAdapter.notifyDataSetChanged();
                        } else {
                            binding.layoutHistoryError.setVisibility(View.VISIBLE);
                        }
                    }

                    @Override
                    public void onFailure(Call<HistoryResponse> call, Throwable t) {
                        binding.layoutHistoryError.setVisibility(View.VISIBLE);
                    }
                });
    }

    private void confirmDeleteHistory(Identification item) {
        new AlertDialog.Builder(this)
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete, (d, w) -> {
                    ApiClient.getInstance(this)
                            .getApiService()
                            .deleteIdentification(item.getId())
                            .enqueue(new Callback<GenericResponse>() {
                                @Override
                                public void onResponse(Call<GenericResponse> call,
                                                       Response<GenericResponse> r) {
                                    int idx = historyList.indexOf(item);
                                    if (idx >= 0) {
                                        historyList.remove(idx);
                                        historyAdapter.notifyItemRemoved(idx);
                                    }
                                }

                                @Override
                                public void onFailure(Call<GenericResponse> call,
                                                      Throwable t) {
                                    Toast.makeText(AssessmentEditorActivity.this,
                                            getString(R.string.network_error),
                                            Toast.LENGTH_SHORT).show();
                                }
                            });
                })
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void updateTitle(Identification item, String newTitle) {
        com.iseegrass.app.model.UpdateTitleRequest req =
                new com.iseegrass.app.model.UpdateTitleRequest(item.getId(), newTitle);
        ApiClient.getInstance(this)
                .getApiService()
                .updateTitle(req)
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> r) {
                        // Reflected on next load
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        Toast.makeText(AssessmentEditorActivity.this,
                                getString(R.string.network_error),
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    private void showProgress(boolean show) {
        binding.progressOverlay.setVisibility(show ? View.VISIBLE : View.GONE);
    }

    private String getEditText(android.widget.EditText et) {
        return et.getText() != null ? et.getText().toString().trim() : "";
    }

    @Override
    public void onBackPressed() {
        // Could show unsaved-changes dialog here if desired
        super.onBackPressed();
    }
}
