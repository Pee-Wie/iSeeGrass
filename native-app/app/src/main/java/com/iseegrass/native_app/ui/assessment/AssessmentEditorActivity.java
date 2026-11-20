package com.iseegrass.native_app.ui.assessment;

import android.app.AlertDialog;
import android.content.Context;
import android.content.res.ColorStateList;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.text.InputType;
import android.text.TextUtils;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;
import android.print.PrintAttributes;
import android.print.PrintManager;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.iseegrass.native_app.R;
import com.iseegrass.native_app.databinding.ActivityAssessmentEditorBinding;
import com.iseegrass.native_app.model.Assessment;
import com.iseegrass.native_app.model.Identification;
import com.iseegrass.native_app.network.Constants;
import com.iseegrass.native_app.ui.identify.IdentificationAdapter;
import com.iseegrass.native_app.ui.identify.IdentifyViewModel;
import com.iseegrass.native_app.viewmodel.AssessmentViewModel;
import com.google.gson.Gson;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Create / edit an Assessment.
 *
 * <p>Pass {@link #EXTRA_ASSESSMENT_ID}, {@link #EXTRA_TITLE}, {@link #EXTRA_CONTENT},
 * and {@link #EXTRA_STATUS} to pre-fill an existing record.
 * Omit (or pass -1 for id) to open a blank create form.</p>
 *
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

    private static final String[] STATUS_VALUES = {"draft", "in_progress", "finalized"};

    // ------------------------------------------------------------------ //
    //  State                                                              //
    // ------------------------------------------------------------------ //

    private ActivityAssessmentEditorBinding binding;
    private AssessmentViewModel assessmentViewModel;
    private IdentifyViewModel identifyViewModel;
    private IdentificationAdapter identificationAdapter;
    private ActivityResultLauncher<String[]> importDocumentLauncher;
    private ActivityResultLauncher<String> exportWordLauncher;
    private ActivityResultLauncher<String> exportExcelLauncher;
    private final Gson gson = new Gson();

    private int assessmentId = -1;
    private int selectedStatusIndex = 0;
    private boolean editorReady;
    private String pendingInitialContent = "";
    private String editorContent = "";
    private byte[] pendingExportBytes = new byte[0];
    private List<Identification> identificationHistory = new ArrayList<>();

    /** Original values captured on load — used for unsaved-changes detection. */
    private String originalTitle   = "";
    private String originalContent = "";
    private String originalStatus  = STATUS_VALUES[0];

    // ------------------------------------------------------------------ //
    //  Lifecycle                                                          //
    // ------------------------------------------------------------------ //

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        importDocumentLauncher = registerForActivityResult(
                new ActivityResultContracts.OpenDocument(), this::importAssessmentDocument);
        exportWordLauncher = registerForActivityResult(
                new ActivityResultContracts.CreateDocument(AssessmentOfficeFile.WORD_MIME),
                this::writeExportedDocument);
        exportExcelLauncher = registerForActivityResult(
                new ActivityResultContracts.CreateDocument(AssessmentOfficeFile.EXCEL_MIME),
                this::writeExportedDocument);
        binding = ActivityAssessmentEditorBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        assessmentId = getIntent().getIntExtra(EXTRA_ASSESSMENT_ID, -1);

        assessmentViewModel = new ViewModelProvider(this)
                .get(AssessmentViewModel.class);
        identifyViewModel = new ViewModelProvider(this)
                .get(IdentifyViewModel.class);

        setupToolbar();
        prefillFromIntent();
        setupHistoryDrawer();
        setupRichEditor();
        setupClickListeners();
        observeViewModels();
        refreshAssessmentFromServer();
    }

    private void updateSpeciesSuggestionHistory() {
        if (!editorReady) return;
        List<String> names = new ArrayList<>();
        for (Identification item : identificationHistory) {
            if (item.getTopResult() != null) names.add(item.getTopResult());
        }
        binding.webEditor.evaluateJavascript(
                "window.setIdentificationHistory("
                        + gson.toJson(names) + ")", null);
    }

    // ------------------------------------------------------------------ //
    //  Setup                                                              //
    // ------------------------------------------------------------------ //

    private void setupToolbar() {
        setSupportActionBar(binding.toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("ASSESSMENT EDITOR");
        }
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());
    }

    private void setupHistoryDrawer() {
        identificationAdapter = new IdentificationAdapter();
        identificationAdapter.setOnDeleteListener(this::confirmDeleteHistoryItem);
        identificationAdapter.setOnItemClickListener(this::confirmInsertIdentification);
        binding.rvHistory.setLayoutManager(new LinearLayoutManager(this));
        binding.rvHistory.setAdapter(identificationAdapter);

        ActivityAssessmentEditorBinding drawerBinding = binding;
        drawerBinding.historyDrawer.post(() -> drawerBinding.historyDrawer.setTranslationX(
                getHistoryDrawerCollapsedOffset()));

        binding.btnHistoryToggle.setOnClickListener(v ->
                setHistoryDrawerOpen(!historyDrawerOpen));
        binding.btnBulkDeleteHistory.setOnClickListener(v -> confirmBulkDeleteHistory());
        binding.btnRetryHistory.setOnClickListener(v ->
                identifyViewModel.loadHistory(this));
        identifyViewModel.loadHistory(this);

        identifyViewModel.historyState.observe(this, state -> {
            if (state instanceof IdentifyViewModel.HistoryState.Loading) {
                binding.progressHistory.setVisibility(View.VISIBLE);
                binding.layoutHistoryError.setVisibility(View.GONE);
                binding.tvHistoryEmpty.setVisibility(View.GONE);
            } else if (state instanceof IdentifyViewModel.HistoryState.Success) {
                List<Identification> items =
                        ((IdentifyViewModel.HistoryState.Success) state).items;
                identificationHistory = items;
                identificationAdapter.setData(items);
                binding.progressHistory.setVisibility(View.GONE);
                binding.layoutHistoryError.setVisibility(View.GONE);
                binding.tvHistoryEmpty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
                updateSpeciesSuggestionHistory();
            } else if (state instanceof IdentifyViewModel.HistoryState.Error) {
                binding.progressHistory.setVisibility(View.GONE);
                binding.layoutHistoryError.setVisibility(View.VISIBLE);
                binding.tvHistoryEmpty.setVisibility(View.GONE);
                binding.tvHistoryError.setText(
                        ((IdentifyViewModel.HistoryState.Error) state).message);
            }
        });
    }

    private boolean historyDrawerOpen;

    private void setHistoryDrawerOpen(boolean open) {
        historyDrawerOpen = open;
        binding.btnHistoryToggle.setRotation(open ? 0f : 180f);
        binding.btnHistoryToggle.setContentDescription(open
                ? "Close identification history" : "Open identification history");
        binding.historyDrawer.animate()
                .translationX(open ? 0f : getHistoryDrawerCollapsedOffset())
                .setDuration(220)
                .start();
        if (open) identifyViewModel.loadHistory(this);
    }

    private int getHistoryDrawerCollapsedOffset() {
        View toggleRail = (View) binding.btnHistoryToggle.getParent();
        return Math.max(0, binding.historyDrawer.getWidth() - toggleRail.getWidth());
    }

    private void confirmInsertIdentification(Identification item) {
        String title = item.getTitle() == null || item.getTitle().trim().isEmpty()
                ? "Untitled" : item.getTitle().trim();
        String species = item.getTopResult() == null ? "Unknown" : item.getTopResult();
        String details = title + "\n" + species + "\n"
                + (item.isManual() ? "Manual key"
                : item.getTopConfidence() == null ? "Confidence unavailable"
                : String.format(Locale.US, "%.1f%% confidence", item.getTopConfidence()))
                + "\n" + (item.getCreatedAt() == null ? "" : item.getCreatedAt());

        new AlertDialog.Builder(this)
                .setTitle("Insert identification?")
                .setMessage(details)
                .setPositiveButton("Insert", (dialog, which) -> {
                    if (!editorReady) {
                        Toast.makeText(this, "Editor is still loading", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    insertIdentification(item);
                    setHistoryDrawerOpen(false);
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    private void insertIdentification(Identification item) {
        String title = item.getTitle() == null || item.getTitle().trim().isEmpty()
                ? "Untitled" : item.getTitle().trim();
        String species = item.getTopResult() == null ? "Unknown" : item.getTopResult();
        StringBuilder html = new StringBuilder("<h2>Identification</h2><p><strong>Title:</strong> ")
                .append(TextUtils.htmlEncode(title))
                .append("</p><p><strong>Species:</strong> ")
                .append(TextUtils.htmlEncode(species))
                .append("</p><p><strong>Confidence:</strong> ")
                .append(item.isManual() ? "Manual key"
                        : item.getTopConfidence() == null ? "Not available"
                        : String.format(Locale.US, "%.1f%%", item.getTopConfidence()))
                .append("</p>");
        if (item.getCreatedAt() != null && !item.getCreatedAt().isEmpty()) {
            html.append("<p><strong>Date:</strong> ")
                    .append(TextUtils.htmlEncode(item.getCreatedAt()))
                    .append("</p>");
        }
        String imageUrl = item.getImageUrl();
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            imageUrl = item.getImageFilename() == null || item.getImageFilename().isEmpty()
                    ? null
                    : Constants.BASE_URL + "public/uploads/identifications/"
                    + Uri.encode(item.getImageFilename());
        } else if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
            imageUrl = Constants.BASE_URL + imageUrl.replaceFirst("^/+", "");
        }
        if (imageUrl != null) {
            html.append("<p><img src=\"")
                    .append(TextUtils.htmlEncode(imageUrl))
                    .append("\" alt=\"Identification image\"></p>");
        }
        binding.webEditor.evaluateJavascript(
                "window.insertHtmlAtSelection("
                        + quoteJavascriptString(html.toString()) + ")",
                null);
    }

    private void confirmDeleteHistoryItem(Identification item) {
        new AlertDialog.Builder(this)
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete,
                        (dialog, which) -> identifyViewModel.deleteHistoryItem(this, item.getId()))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void confirmBulkDeleteHistory() {
        new AlertDialog.Builder(this)
                .setMessage(R.string.confirm_bulk_delete)
                .setPositiveButton(R.string.delete,
                        (dialog, which) -> identifyViewModel.deleteAllHistory(this))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void setupRichEditor() {
        WebView webView = binding.webEditor;
        setSaveButtonsEnabled(false);
        binding.etTitle.setTextColor(Color.rgb(23, 37, 28));
        binding.etTitle.setHintTextColor(Color.rgb(82, 96, 82));
        tintButton(binding.btnUndo, "#FFFFFF", "#26352A");
        tintButton(binding.btnRedo, "#FFFFFF", "#26352A");
        tintButton(binding.btnBold, "#FFFFFF", "#26352A");
        tintButton(binding.btnItalic, "#FFFFFF", "#26352A");
        tintButton(binding.btnUnderline, "#FFFFFF", "#26352A");
        tintButton(binding.btnStrike, "#FFFFFF", "#26352A");
        tintButton(binding.btnCode, "#FFFFFF", "#26352A");
        tintButton(binding.btnTextColor, "#FFFFFF", "#176B3A");
        tintButton(binding.btnBullets, "#FFFFFF", "#26352A");
        tintButton(binding.btnNumbers, "#FFFFFF", "#26352A");
        tintButton(binding.btnAlignLeft, "#FFFFFF", "#26352A");
        tintButton(binding.btnAlignCenter, "#FFFFFF", "#26352A");
        tintButton(binding.btnAlignRight, "#FFFFFF", "#26352A");
        tintButton(binding.btnHeading, "#FFFFFF", "#26352A");
        tintButton(binding.btnInsertTable, "#FFFFFF", "#26352A");
        tintButton(binding.btnTemplate, "#FFFFFF", "#26352A");
        tintButton(binding.btnClear, "#FCE8E6", "#8C1D18");
        tintButton(binding.btnPreview, "#E3EAE4", "#183A24");
        tintButton(binding.btnTransectTable, "#DCE8E0", "#183A24");
        tintButton(binding.btnImportHtml, "#E3EAE4", "#183A24");
        tintButton(binding.btnPrint, "#E3EAE4", "#183A24");
        tintButton(binding.btnExportWord, "#E3EAE4", "#183A24");
        tintButton(binding.btnExportExcel, "#E3EAE4", "#183A24");
        tintButton(binding.btnSave, "#1E4822", "#FFFFFF");
        tintButton(binding.btnSaveProgress, "#795300", "#FFFFFF");
        tintButton(binding.btnFinalize, "#287A4C", "#FFFFFF");
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowFileAccessFromFileURLs(false);
        webView.getSettings().setAllowUniversalAccessFromFileURLs(false);
        webView.addJavascriptInterface(new EditorBridge(), "NativeEditor");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsConfirm(WebView view, String url, String message,
                                       JsResult result) {
                new AlertDialog.Builder(AssessmentEditorActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                        .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                        .setOnCancelListener(dialog -> result.cancel())
                        .show();
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!url.startsWith("file:///android_asset/assessment-editor.html")) return;
                editorReady = true;
                setEditorContent(pendingInitialContent, true);
                updateSpeciesSuggestionHistory();
            }
        });
        webView.loadUrl("file:///android_asset/assessment-editor.html");

        binding.btnBold.setOnClickListener(v -> runEditorCommand("bold"));
        binding.btnItalic.setOnClickListener(v -> runEditorCommand("italic"));
        binding.btnUnderline.setOnClickListener(v -> runEditorCommand("underline"));
        binding.btnStrike.setOnClickListener(v -> runEditorCommand("strikeThrough"));
        binding.btnCode.setOnClickListener(v -> runEditorCommand("formatBlock", "pre"));
        binding.btnUndo.setOnClickListener(v -> runEditorCommand("undo"));
        binding.btnRedo.setOnClickListener(v -> runEditorCommand("redo"));
        binding.btnTextColor.setOnClickListener(v -> runEditorCommand("foreColor", "#176B3A"));
        binding.btnHeading.setOnClickListener(v -> runEditorCommand("formatBlock", "h2"));
        binding.btnBullets.setOnClickListener(v -> runEditorCommand("insertUnorderedList"));
        binding.btnNumbers.setOnClickListener(v -> runEditorCommand("insertOrderedList"));
        binding.btnAlignLeft.setOnClickListener(v -> runEditorCommand("justifyLeft"));
        binding.btnAlignCenter.setOnClickListener(v -> runEditorCommand("justifyCenter"));
        binding.btnAlignRight.setOnClickListener(v -> runEditorCommand("justifyRight"));
        binding.btnInsertTable.setOnClickListener(v -> showInsertTableDialog());
        binding.btnTemplate.setOnClickListener(v -> showTemplateChooser());
        binding.btnTransectTable.setOnClickListener(v -> {
            if (editorReady) binding.webEditor.evaluateJavascript(
                    "window.insertTransectTable()", null);
        });
        binding.btnImportHtml.setOnClickListener(v ->
                importDocumentLauncher.launch(new String[]{
                        "text/html", "text/plain", "application/xhtml+xml",
                        AssessmentOfficeFile.WORD_MIME, AssessmentOfficeFile.EXCEL_MIME
                }));
        binding.btnExportWord.setOnClickListener(v -> exportAssessment("docx"));
        binding.btnExportExcel.setOnClickListener(v -> exportAssessment("xlsx"));
        binding.btnPrint.setOnClickListener(v -> printAssessment());
        binding.btnClear.setOnClickListener(v -> confirmClearContent());
        binding.btnPreview.setOnClickListener(v -> togglePreview());
    }

    private void runEditorCommand(String command) {
        runEditorCommand(command, null);
    }

    private void runEditorCommand(String command, String value) {
        if (!editorReady) return;
        String script = "window.runEditorCommand("
                + quoteJavascriptString(command) + ","
                + (value == null ? "null" : quoteJavascriptString(value)) + ")";
        binding.webEditor.evaluateJavascript(script, null);
    }

    private void showInsertTableDialog() {
        if (editorReady) {
            binding.webEditor.evaluateJavascript("window.saveEditorSelection()", null);
        }

        LinearLayout fields = new LinearLayout(this);
        fields.setOrientation(LinearLayout.HORIZONTAL);
        int padding = (int) (20 * getResources().getDisplayMetrics().density);
        fields.setPadding(padding, padding, padding, 0);

        EditText rowsInput = new EditText(this);
        rowsInput.setHint("Rows (1-12)");
        rowsInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        rowsInput.setText("3");
        fields.addView(rowsInput, new LinearLayout.LayoutParams(0,
                LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        EditText columnsInput = new EditText(this);
        columnsInput.setHint("Columns (1-10)");
        columnsInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        columnsInput.setText("3");
        fields.addView(columnsInput, new LinearLayout.LayoutParams(0,
                LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        new AlertDialog.Builder(this)
                .setTitle("Insert table")
                .setView(fields)
                .setNegativeButton(android.R.string.cancel, null)
                .setPositiveButton("Insert", (dialog, which) -> {
                    int rows = boundedNumber(rowsInput.getText().toString(), 3, 1, 12);
                    int columns = boundedNumber(columnsInput.getText().toString(), 3, 1, 10);
                    binding.webEditor.evaluateJavascript(
                            "window.insertTable(" + rows + "," + columns + ")", null);
                })
                .show();
    }

    private void showTemplateChooser() {
        if (!editorReady) return;
        String[] templates = {"Blank page", "Field survey", "Species observation"};
        new AlertDialog.Builder(this)
                .setTitle("Choose a template")
                .setItems(templates, (dialog, which) -> binding.webEditor.evaluateJavascript(
                        "window.loadTemplate(" + which + ")", null))
                .show();
    }

    private int boundedNumber(String value, int fallback, int minimum, int maximum) {
        try {
            return Math.max(minimum, Math.min(maximum, Integer.parseInt(value)));
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    private void setEditorContent(String content, boolean initialLoad) {
        if (!editorReady) return;
        binding.webEditor.evaluateJavascript(
                "window.setEditorContent("
                        + quoteJavascriptString(content == null ? "" : content) + ")",
                result -> {
                    String normalized = gson.fromJson(result, String.class);
                    editorContent = normalized == null ? "" : normalized;
                    if (initialLoad) originalContent = editorContent;
                    setSaveButtonsEnabled(true);
                    binding.tvEditorState.setText("Ready");
                    updateEditorCounts(editorContent);
                });
    }

    private void updateEditorCounts(String html) {
        String text = android.text.Html.fromHtml(html, android.text.Html.FROM_HTML_MODE_COMPACT)
                .toString().trim();
        int words = text.isEmpty() ? 0 : text.split("\\s+").length;
        binding.tvEditorCounts.setText("Words: " + words + "   |   Chars: " + text.length());
    }

    private String quoteJavascriptString(String value) {
        return org.json.JSONObject.quote(value);
    }

    private void setupClickListeners() {
        binding.btnSave.setOnClickListener(v -> saveAssessment(0));
        binding.btnSaveProgress.setOnClickListener(v -> saveAssessment(1));
        binding.btnFinalize.setOnClickListener(v -> saveAssessment(2));

        binding.btnClear.setOnClickListener(v -> confirmClearContent());
        binding.btnPreview.setOnClickListener(v -> togglePreview());
    }

    // ------------------------------------------------------------------ //
    //  Prefill from Intent                                                //
    // ------------------------------------------------------------------ //

    private void prefillFromIntent() {
        String title   = getIntent().getStringExtra(EXTRA_TITLE);
        String content = getIntent().getStringExtra(EXTRA_CONTENT);
        String status  = getIntent().getStringExtra(EXTRA_STATUS);

        if (title != null)   binding.etTitle.setText(title);
        pendingInitialContent = content != null ? content : "";

        if (status != null) {
            for (int i = 0; i < STATUS_VALUES.length; i++) {
                if (STATUS_VALUES[i].equals(status)) {
                    selectedStatusIndex = i;
                    break;
                }
            }
        }

        // Capture originals for unsaved-changes detection
        originalTitle   = title   != null ? title   : "";
        originalContent = pendingInitialContent;
        originalStatus  = status  != null ? status  : STATUS_VALUES[0];
    }

    private void refreshAssessmentFromServer() {
        if (assessmentId <= 0) return;
        binding.tvEditorState.setText("Loading latest");
        assessmentViewModel.loadAssessment(this, assessmentId,
                new AssessmentViewModel.AssessmentLoadCallback() {
                    @Override
                    public void onSuccess(Assessment assessment) {
                        binding.etTitle.setText(assessment.getTitle());
                        selectedStatusIndex = statusIndex(assessment.getStatus());
                        originalTitle = assessment.getTitle() != null
                                ? assessment.getTitle() : "";
                        originalStatus = STATUS_VALUES[selectedStatusIndex];
                        pendingInitialContent = assessment.getContent() != null
                                ? assessment.getContent() : "";
                        originalContent = pendingInitialContent;
                        if (editorReady) setEditorContent(pendingInitialContent, true);
                        binding.tvEditorState.setText("Synced");
                    }

                    @Override
                    public void onError(String message) {
                        binding.tvEditorState.setText("Refresh failed");
                        Toast.makeText(AssessmentEditorActivity.this,
                                "Showing the last loaded copy. " + message,
                                Toast.LENGTH_LONG).show();
                    }
                });
    }

    private int statusIndex(String status) {
        for (int i = 0; i < STATUS_VALUES.length; i++) {
            if (STATUS_VALUES[i].equals(status)) return i;
        }
        return 0;
    }

    // ------------------------------------------------------------------ //
    //  Observe ViewModels                                                 //
    // ------------------------------------------------------------------ //

    private void observeViewModels() {
        // Assessment save / create actions
        assessmentViewModel.actionState.observe(this, state -> {
            if (state instanceof AssessmentViewModel.AssessmentActionState.Loading) {
                showProgress(true);
                setSaveButtonsEnabled(false);

            } else if (state instanceof AssessmentViewModel.AssessmentActionState.Success) {
                showProgress(false);
                setSaveButtonsEnabled(true);
                String msg = ((AssessmentViewModel.AssessmentActionState.Success) state).message;
                binding.tvEditorState.setText("Saved");
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
                assessmentViewModel.clearActionState();
                setResult(RESULT_OK);
                finish();

            } else if (state instanceof AssessmentViewModel.AssessmentActionState.Error) {
                showProgress(false);
                setSaveButtonsEnabled(true);
                String msg = ((AssessmentViewModel.AssessmentActionState.Error) state).message;
                binding.tvEditorState.setText("Save failed");
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
                assessmentViewModel.clearActionState();
            }
        });

    }

    // ------------------------------------------------------------------ //
    //  Save                                                               //
    // ------------------------------------------------------------------ //

    private void saveAssessment(int statusIndex) {
        String title   = getEditTextValue(binding.etTitle);
        selectedStatusIndex = statusIndex;
        String status  = STATUS_VALUES[statusIndex];

        if (title.isEmpty()) {
            binding.tilTitle.setError(getString(R.string.title) + " is required");
            return;
        }
        binding.tilTitle.setError(null);

        if (!editorReady) {
            Toast.makeText(this, "Editor is still loading", Toast.LENGTH_SHORT).show();
            return;
        }

        binding.webEditor.evaluateJavascript("window.getEditorContent()", result -> {
            String content;
            try {
                content = gson.fromJson(result, String.class);
            } catch (com.google.gson.JsonParseException exception) {
                Toast.makeText(this, "Could not read the editor content", Toast.LENGTH_LONG).show();
                return;
            }
            content = content == null ? "" : content;
            editorContent = content;
            binding.tvEditorState.setText("Saving...");
            if (assessmentId > 0) {
                assessmentViewModel.updateAssessment(this, assessmentId, title, content, status);
            } else {
                assessmentViewModel.createAssessment(this, title, content, status);
            }
        });
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
        String currentStatus  = STATUS_VALUES[selectedStatusIndex];

        return !currentTitle.equals(originalTitle)
                || !editorContent.equals(originalContent)
                || !currentStatus.equals(originalStatus);
    }

    private void importAssessmentDocument(Uri uri) {
        if (uri == null) return;
        try {
            String filename = getDisplayName(uri);
            String mimeType = getContentResolver().getType(uri);
            if (!filename.contains(".")) {
                if (AssessmentOfficeFile.WORD_MIME.equals(mimeType)) filename += ".docx";
                else if (AssessmentOfficeFile.EXCEL_MIME.equals(mimeType)) filename += ".xlsx";
                else if ("text/html".equals(mimeType) || "application/xhtml+xml".equals(mimeType)) {
                    filename += ".html";
                } else if ("text/plain".equals(mimeType)) filename += ".txt";
            }
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (InputStream input = getContentResolver().openInputStream(uri)) {
                if (input == null) throw new IOException("Could not open the selected file.");
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (bytes.size() + count > 25 * 1024 * 1024) {
                        throw new IOException("Files larger than 25 MB cannot be imported.");
                    }
                    bytes.write(buffer, 0, count);
                }
            }
            AssessmentOfficeFile.ImportedAssessment imported =
                    AssessmentOfficeFile.importDocument(bytes.toByteArray(), filename);
            setEditorContent(imported.content, false);
            String importedTitle = imported.title == null || imported.title.trim().isEmpty()
                    ? filename.replaceFirst("\\.[^.]+$", "") : imported.title;
            binding.etTitle.setText(importedTitle);
            if (imported.status != null && !imported.status.trim().isEmpty()) {
                selectedStatusIndex = statusIndex(imported.status.trim()
                        .replace('-', '_').equals("final") ? "finalized"
                        : imported.status.trim().replace('-', '_'));
            }
            Toast.makeText(this, "Imported " + filename, Toast.LENGTH_SHORT).show();
        } catch (IOException exception) {
            Toast.makeText(this, exception.getMessage() == null
                    ? "Could not import the selected file." : exception.getMessage(),
                    Toast.LENGTH_LONG).show();
        }
    }

    private String getDisplayName(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameColumn = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameColumn >= 0) return cursor.getString(nameColumn);
            }
        }
        String path = uri.getLastPathSegment();
        return path == null || path.isEmpty() ? "assessment" : path;
    }

    private void exportAssessment(String format) {
        if (!editorReady) {
            Toast.makeText(this, "Editor is still loading", Toast.LENGTH_SHORT).show();
            return;
        }
        binding.webEditor.evaluateJavascript("window.getEditorContent()", result -> {
            String content;
            try {
                content = gson.fromJson(result, String.class);
            } catch (RuntimeException exception) {
                Toast.makeText(this, "Could not read the assessment content", Toast.LENGTH_LONG).show();
                return;
            }
            String title = getEditTextValue(binding.etTitle);
            String status = STATUS_VALUES[selectedStatusIndex];
            try {
                pendingExportBytes = "xlsx".equals(format)
                        ? AssessmentOfficeFile.createXlsx(title, status, content)
                        : AssessmentOfficeFile.createDocx(title, status, content);
            } catch (IOException | IllegalArgumentException exception) {
                Toast.makeText(this, "Could not prepare the Office document",
                        Toast.LENGTH_LONG).show();
                return;
            }
            String safeName = title.trim().isEmpty() ? "assessment"
                    : title.trim().replaceAll("[^A-Za-z0-9._-]", "_");
            String filename = safeName + "." + format;
            if ("xlsx".equals(format)) exportExcelLauncher.launch(filename);
            else exportWordLauncher.launch(filename);
        });
    }

    private void writeExportedDocument(Uri uri) {
        if (uri == null) {
            pendingExportBytes = new byte[0];
            return;
        }
        try (OutputStream output = getContentResolver().openOutputStream(uri)) {
            if (output == null) {
                Toast.makeText(this, "Could not create the selected file", Toast.LENGTH_SHORT).show();
                return;
            }
            output.write(pendingExportBytes);
            Toast.makeText(this, "Office document exported", Toast.LENGTH_SHORT).show();
        } catch (IOException exception) {
            Toast.makeText(this, "Could not write the selected file", Toast.LENGTH_SHORT).show();
        } finally {
            pendingExportBytes = new byte[0];
        }
    }

    private void printAssessment() {
        if (!editorReady) {
            Toast.makeText(this, "Editor is still loading", Toast.LENGTH_SHORT).show();
            return;
        }
        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) {
            Toast.makeText(this, "Printing is unavailable on this device", Toast.LENGTH_LONG).show();
            return;
        }
        String title = getEditTextValue(binding.etTitle);
        String printTitle = title.isEmpty() ? "Assessment" : title;
        printManager.print(printTitle, binding.webEditor.createPrintDocumentAdapter(printTitle),
                new PrintAttributes.Builder().build());
    }

    private void confirmClearContent() {
        new AlertDialog.Builder(this)
                .setMessage("Clear all assessment content?")
                .setNegativeButton(android.R.string.cancel, null)
                .setPositiveButton("Clear", (dialog, which) -> setEditorContent("", false))
                .show();
    }

    private boolean previewMode;

    private void togglePreview() {
        if (!editorReady) return;
        previewMode = !previewMode;
        binding.webEditor.evaluateJavascript(
                "window.setPreviewMode(" + previewMode + ")", null);
        binding.btnPreview.setText(previewMode ? "Edit" : "Preview");
    }

    private void setSaveButtonsEnabled(boolean enabled) {
        binding.btnSave.setEnabled(enabled);
        binding.btnSaveProgress.setEnabled(enabled);
        binding.btnFinalize.setEnabled(enabled);
    }

    private void tintButton(android.widget.Button button, String background, String text) {
        button.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor(background)));
        button.setTextColor(Color.parseColor(text));
    }

    private final class EditorBridge {
        @JavascriptInterface
        public void onContentChanged(String html, int words, int characters) {
            runOnUiThread(() -> {
                editorContent = html == null ? "" : html;
                binding.tvEditorCounts.setText(
                        "Words: " + words + "   |   Chars: " + characters);
                binding.tvEditorState.setText("Editing");
            });
        }
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
