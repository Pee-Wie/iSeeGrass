package com.iseegrass.app.ui.identify;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.iseegrass.app.R;
import com.iseegrass.app.databinding.FragmentIdentifyBinding;
import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.model.HistoryResponse;
import com.iseegrass.app.model.Identification;
import com.iseegrass.app.model.IdentificationResult;
import com.iseegrass.app.model.IdentifyResponse;
import com.iseegrass.app.network.ApiClient;
import com.iseegrass.app.network.Constants;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Identification module.
 *
 * Features:
 * - Photo collector (add via camera or gallery, 3-column grid)
 * - Send to 75% identify
 * - Result display (species + confidence + scores list)
 * - ID History with toggle show/hide, delete per item, bulk delete, retry
 * - Title field per image is handled via long-click in PhotoAdapter
 */
public class IdentifyFragment extends Fragment {

    private FragmentIdentifyBinding binding;

    // Photo collector
    private PhotoAdapter photoAdapter;
    private final List<Uri> photoUris = new ArrayList<>();
    private final List<String> photoTitles = new ArrayList<>();
    private boolean selectionMode = false;
    private Uri cameraImageUri;

    // History
    private HistoryAdapter historyAdapter;
    private final List<Identification> historyList = new ArrayList<>();
    private boolean historyVisible = true;
    private static final int HISTORY_LIMIT = 20;
    private int historyOffset = 0;

    // Camera launcher
    private ActivityResultLauncher<Intent> cameraLauncher;
    private ActivityResultLauncher<String> galleryLauncher;
    private ActivityResultLauncher<String> cameraPermissionLauncher;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        cameraLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == Activity.RESULT_OK
                            && cameraImageUri != null) {
                        addPhoto(cameraImageUri);
                    }
                });

        galleryLauncher = registerForActivityResult(
                new ActivityResultContracts.GetContent(),
                uri -> {
                    if (uri != null) addPhoto(uri);
                });

        cameraPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> {
                    if (granted) launchCamera();
                    else Toast.makeText(requireContext(),
                            "Camera permission required", Toast.LENGTH_SHORT).show();
                });
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container,
                             Bundle savedInstanceState) {
        binding = FragmentIdentifyBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view,
                               @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        setupPhotoGrid();
        setupHistoryList();
        setupClickListeners();
        loadHistory();
    }

    // ------------------------------------------------------------------ //
    //  Photo collector                                                    //
    // ------------------------------------------------------------------ //

    private void setupPhotoGrid() {
        photoAdapter = new PhotoAdapter(
                photoUris,
                photoTitles,
                /* onPhotoClick */ (position, uri) -> {
                    if (selectionMode) {
                        photoAdapter.toggleSelection(position);
                        updateBulkDeleteVisibility();
                    } else {
                        showPhotoOptions(position, uri);
                    }
                },
                /* onPhotoLongClick */ (position, uri) -> {
                    enterSelectionMode();
                    photoAdapter.toggleSelection(position);
                    updateBulkDeleteVisibility();
                }
        );

        binding.rvPhotos.setLayoutManager(new GridLayoutManager(requireContext(), 3));
        binding.rvPhotos.setAdapter(photoAdapter);
    }

    private void addPhoto(Uri uri) {
        if (photoUris.size() >= 10) {
            Toast.makeText(requireContext(),
                    "Maximum 10 images", Toast.LENGTH_SHORT).show();
            return;
        }
        photoUris.add(uri);
        photoTitles.add(""); // empty title by default
        photoAdapter.notifyItemInserted(photoUris.size() - 1);
    }

    private void showPhotoOptions(int position, Uri uri) {
        String[] options = {
                getString(R.string.rename),
                getString(R.string.send_to_identify),
                getString(R.string.delete)
        };
        new AlertDialog.Builder(requireContext())
                .setItems(options, (dialog, which) -> {
                    if (which == 0) showRenameDialog(position);
                    else if (which == 1) sendSingleToIdentify(position);
                    else removePhoto(position);
                })
                .show();
    }

    private void showRenameDialog(int position) {
        android.widget.EditText et = new android.widget.EditText(requireContext());
        et.setText(photoTitles.get(position));
        new AlertDialog.Builder(requireContext())
                .setTitle(R.string.rename)
                .setView(et)
                .setPositiveButton(android.R.string.ok, (d, w) -> {
                    photoTitles.set(position, et.getText().toString().trim());
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    private void sendSingleToIdentify(int position) {
        List<Uri> single = new ArrayList<>();
        single.add(photoUris.get(position));
        runIdentify(single);
    }

    private void removePhoto(int position) {
        photoUris.remove(position);
        photoTitles.remove(position);
        photoAdapter.notifyItemRemoved(position);
        if (photoUris.isEmpty()) exitSelectionMode();
    }

    private void enterSelectionMode() {
        selectionMode = true;
        photoAdapter.setSelectionMode(true);
        binding.btnBulkDeletePhotos.setVisibility(View.VISIBLE);
    }

    private void exitSelectionMode() {
        selectionMode = false;
        photoAdapter.setSelectionMode(false);
        photoAdapter.clearSelections();
        binding.btnBulkDeletePhotos.setVisibility(View.GONE);
    }

    private void updateBulkDeleteVisibility() {
        boolean hasSelection = !photoAdapter.getSelectedPositions().isEmpty();
        binding.btnBulkDeletePhotos.setVisibility(
                (selectionMode && hasSelection) ? View.VISIBLE : View.GONE);
    }

    // ------------------------------------------------------------------ //
    //  Camera / Gallery                                                   //
    // ------------------------------------------------------------------ //

    private void showImageSourceDialog() {
        new AlertDialog.Builder(requireContext())
                .setItems(new CharSequence[]{
                        getString(R.string.capture_camera),
                        getString(R.string.upload_gallery)
                }, (dialog, which) -> {
                    if (which == 0) requestCameraOrLaunch();
                    else galleryLauncher.launch("image/*");
                })
                .show();
    }

    private void requestCameraOrLaunch() {
        if (ContextCompat.checkSelfPermission(requireContext(),
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            launchCamera();
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
        }
    }

    private void launchCamera() {
        File photoFile;
        try {
            photoFile = createImageFile();
        } catch (IOException e) {
            Toast.makeText(requireContext(), "Could not create image file",
                    Toast.LENGTH_SHORT).show();
            return;
        }
        cameraImageUri = FileProvider.getUriForFile(
                requireContext(),
                requireContext().getPackageName() + ".fileprovider",
                photoFile);
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
        cameraLauncher.launch(intent);
    }

    private File createImageFile() throws IOException {
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US)
                .format(new Date());
        File storageDir = requireContext()
                .getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile("IMG_" + timestamp, ".jpg", storageDir);
    }

    // ------------------------------------------------------------------ //
    //  Identify                                                           //
    // ------------------------------------------------------------------ //

    private void runIdentify(List<Uri> uris) {
        if (uris.isEmpty()) {
            Toast.makeText(requireContext(),
                    "Add at least one photo first", Toast.LENGTH_SHORT).show();
            return;
        }

        binding.progressIdentify.setVisibility(View.VISIBLE);
        binding.btnIdentify.setEnabled(false);
        binding.cardResult.setVisibility(View.GONE);

        Uri uri = uris.get(0); // send first image
        File file = new File(getRealPathFromUri(uri));

        RequestBody reqBody = RequestBody.create(
                MediaType.parse("image/*"), file);
        MultipartBody.Part imagePart = MultipartBody.Part
                .createFormData("image", file.getName(), reqBody);
        RequestBody modelType = RequestBody.create(
                MediaType.parse("text/plain"), "75");

        ApiClient.getInstance(requireContext())
                .getApiService()
                .identify(imagePart, modelType)
                .enqueue(new Callback<IdentifyResponse>() {
                    @Override
                    public void onResponse(Call<IdentifyResponse> call,
                                           Response<IdentifyResponse> response) {
                        if (binding == null) return;
                        binding.progressIdentify.setVisibility(View.GONE);
                        binding.btnIdentify.setEnabled(true);

                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            showResult(response.body().getData());
                            // Refresh history to include new record
                            resetAndLoadHistory();
                        } else {
                            Toast.makeText(requireContext(),
                                    getString(R.string.network_error),
                                    Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<IdentifyResponse> call, Throwable t) {
                        if (binding == null) return;
                        binding.progressIdentify.setVisibility(View.GONE);
                        binding.btnIdentify.setEnabled(true);
                        Toast.makeText(requireContext(),
                                getString(R.string.network_error),
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void showResult(IdentificationResult result) {
        binding.cardResult.setVisibility(View.VISIBLE);
        binding.tvResultSpecies.setText(
                getString(R.string.species_result, result.getTopResult()));
        binding.tvResultConfidence.setText(
                getString(R.string.confidence_result, result.getTopConfidence()));

        ScoreAdapter scoreAdapter = new ScoreAdapter(result.getScores());
        binding.rvScores.setLayoutManager(
                new LinearLayoutManager(requireContext()));
        binding.rvScores.setAdapter(scoreAdapter);
    }

    /** Convert content URI to filesystem path for Retrofit file upload. */
    private String getRealPathFromUri(Uri uri) {
        // For file:// URIs, just use the path; for content:// use a temp copy
        if ("file".equals(uri.getScheme())) {
            return uri.getPath();
        }
        // Copy content:// to a temp file
        try {
            File tempFile = File.createTempFile("upload", ".jpg",
                    requireContext().getCacheDir());
            try (java.io.InputStream in =
                         requireContext().getContentResolver().openInputStream(uri);
                 java.io.FileOutputStream out = new java.io.FileOutputStream(tempFile)) {
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            }
            return tempFile.getAbsolutePath();
        } catch (IOException e) {
            return uri.getPath(); // fallback
        }
    }

    // ------------------------------------------------------------------ //
    //  History                                                            //
    // ------------------------------------------------------------------ //

    private void setupHistoryList() {
        historyAdapter = new HistoryAdapter(
                historyList,
                /* onDelete */ identification -> confirmDeleteHistory(identification),
                /* onTitleEdit */ (identification, newTitle) ->
                        updateHistoryTitle(identification, newTitle)
        );
        binding.rvHistory.setLayoutManager(
                new LinearLayoutManager(requireContext()));
        binding.rvHistory.setAdapter(historyAdapter);

        binding.swipeHistory.setColorSchemeColors(
                ContextCompat.getColor(requireContext(), R.color.accent));
        binding.swipeHistory.setOnRefreshListener(this::resetAndLoadHistory);
    }

    private void loadHistory() {
        binding.layoutHistoryError.setVisibility(View.GONE);

        ApiClient.getInstance(requireContext())
                .getApiService()
                .getHistory(HISTORY_LIMIT, historyOffset)
                .enqueue(new Callback<HistoryResponse>() {
                    @Override
                    public void onResponse(Call<HistoryResponse> call,
                                           Response<HistoryResponse> response) {
                        if (binding == null) return;
                        binding.swipeHistory.setRefreshing(false);

                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getData() != null) {
                            List<Identification> records =
                                    response.body().getData().getRecords();
                            if (historyOffset == 0) {
                                historyList.clear();
                            }
                            if (records != null) {
                                historyList.addAll(records);
                                historyOffset += records.size();
                            }
                            historyAdapter.notifyDataSetChanged();
                        } else {
                            showHistoryError();
                        }
                    }

                    @Override
                    public void onFailure(Call<HistoryResponse> call, Throwable t) {
                        if (binding == null) return;
                        binding.swipeHistory.setRefreshing(false);
                        showHistoryError();
                    }
                });
    }

    private void resetAndLoadHistory() {
        historyOffset = 0;
        loadHistory();
    }

    private void showHistoryError() {
        binding.layoutHistoryError.setVisibility(View.VISIBLE);
    }

    private void confirmDeleteHistory(Identification item) {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete, (d, w) -> deleteHistory(item))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void deleteHistory(Identification item) {
        ApiClient.getInstance(requireContext())
                .getApiService()
                .deleteIdentification(item.getId())
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        if (binding == null) return;
                        int idx = historyList.indexOf(item);
                        if (idx >= 0) {
                            historyList.remove(idx);
                            historyAdapter.notifyItemRemoved(idx);
                        }
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

    private void bulkDeleteHistory() {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_bulk_delete)
                .setPositiveButton(R.string.delete, (d, w) -> {
                    ApiClient.getInstance(requireContext())
                            .getApiService()
                            .deleteAllIdentifications()
                            .enqueue(new Callback<GenericResponse>() {
                                @Override
                                public void onResponse(Call<GenericResponse> call,
                                                       Response<GenericResponse> response) {
                                    if (binding == null) return;
                                    historyList.clear();
                                    historyAdapter.notifyDataSetChanged();
                                    historyOffset = 0;
                                }

                                @Override
                                public void onFailure(Call<GenericResponse> call,
                                                      Throwable t) {
                                    if (binding == null) return;
                                    Toast.makeText(requireContext(),
                                            getString(R.string.network_error),
                                            Toast.LENGTH_SHORT).show();
                                }
                            });
                })
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void updateHistoryTitle(Identification item, String newTitle) {
        com.iseegrass.app.model.UpdateTitleRequest req =
                new com.iseegrass.app.model.UpdateTitleRequest(item.getId(), newTitle);
        ApiClient.getInstance(requireContext())
                .getApiService()
                .updateTitle(req)
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        // Title updated — list will reflect on next refresh
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

    // ------------------------------------------------------------------ //
    //  Click listeners                                                    //
    // ------------------------------------------------------------------ //

    private void setupClickListeners() {
        binding.btnAddPhoto.setOnClickListener(v -> showImageSourceDialog());

        binding.btnIdentify.setOnClickListener(v -> runIdentify(new ArrayList<>(photoUris)));

        binding.btnBulkDeletePhotos.setOnClickListener(v -> {
            List<Integer> selected = new ArrayList<>(photoAdapter.getSelectedPositions());
            // Sort descending to avoid index shift
            selected.sort((a, b) -> b - a);
            for (int pos : selected) {
                photoUris.remove(pos);
                photoTitles.remove(pos);
            }
            photoAdapter.clearSelections();
            photoAdapter.notifyDataSetChanged();
            exitSelectionMode();
        });

        binding.btnBulkDeleteHistory.setOnClickListener(v -> bulkDeleteHistory());

        binding.btnToggleHistory.setOnClickListener(v -> {
            historyVisible = !historyVisible;
            binding.swipeHistory.setVisibility(historyVisible ? View.VISIBLE : View.GONE);
            binding.btnBulkDeleteHistory.setVisibility(historyVisible ? View.VISIBLE : View.GONE);
            binding.btnToggleHistory.setImageResource(
                    historyVisible ? R.drawable.ic_chevron_up : R.drawable.ic_chevron_down);
        });

        binding.btnRetryHistory.setOnClickListener(v -> resetAndLoadHistory());
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
