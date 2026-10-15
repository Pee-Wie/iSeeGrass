package com.iseegrass.app.ui.identify;

import android.Manifest;
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
import android.widget.EditText;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.iseegrass.app.R;
import com.iseegrass.app.databinding.FragmentIdentifyBinding;
import com.iseegrass.app.model.Identification;
import com.iseegrass.app.model.IdentificationResult;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Identification module fragment.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Photo collector — add from camera or gallery, 3-column grid, bulk-delete</li>
 *   <li>Send to 75% identify via {@link IdentifyViewModel}</li>
 *   <li>Result card with species name, confidence, and score list</li>
 *   <li>ID History — toggle show/hide, per-item delete, bulk-delete, pull-to-refresh,
 *       swipe-to-delete, retry on error</li>
 * </ul>
 * All network calls are delegated to {@link IdentifyViewModel}; this class only
 * observes LiveData and updates views.</p>
 */
public class IdentifyFragment extends Fragment {

    // ------------------------------------------------------------------ //
    //  Fields                                                             //
    // ------------------------------------------------------------------ //

    private FragmentIdentifyBinding binding;
    private IdentifyViewModel viewModel;

    // Adapters
    private PhotoAdapter photoAdapter;
    private IdentificationAdapter identificationAdapter;
    private ScoreAdapter scoreAdapter;

    // Camera
    private Uri cameraImageUri;

    // History visibility state
    private boolean historyVisible = true;

    // ActivityResult launchers (must be registered in onCreate)
    private ActivityResultLauncher<Intent> cameraLauncher;
    private ActivityResultLauncher<String> galleryLauncher;
    private ActivityResultLauncher<String> cameraPermissionLauncher;

    // ------------------------------------------------------------------ //
    //  Lifecycle                                                          //
    // ------------------------------------------------------------------ //

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerActivityResultLaunchers();
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

        viewModel = new ViewModelProvider(this).get(IdentifyViewModel.class);

        setupPhotoGrid();
        setupHistoryList();
        setupClickListeners();
        observeViewModel();
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.loadHistory(requireContext());
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }

    // ------------------------------------------------------------------ //
    //  ActivityResult launchers                                           //
    // ------------------------------------------------------------------ //

    private void registerActivityResultLaunchers() {
        cameraLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == android.app.Activity.RESULT_OK
                            && cameraImageUri != null) {
                        viewModel.addPhoto(cameraImageUri, "");
                    }
                });

        galleryLauncher = registerForActivityResult(
                new ActivityResultContracts.GetContent(),
                uri -> {
                    if (uri != null) viewModel.addPhoto(uri, "");
                });

        cameraPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> {
                    if (granted) launchCamera();
                    else Toast.makeText(requireContext(),
                            "Camera permission is required", Toast.LENGTH_SHORT).show();
                });
    }

    // ------------------------------------------------------------------ //
    //  Photo grid setup                                                   //
    // ------------------------------------------------------------------ //

    private void setupPhotoGrid() {
        photoAdapter = new PhotoAdapter();

        photoAdapter.setOnPhotoClickListener((position, item) -> showPhotoDetailDialog(position, item));

        photoAdapter.setOnPhotoLongClickListener((position, item) -> {
            photoAdapter.enterSelectionMode();
            item.setSelected(true);
            photoAdapter.notifyItemChanged(position);
            binding.btnBulkDeletePhotos.setVisibility(View.VISIBLE);
        });

        binding.rvPhotos.setLayoutManager(new GridLayoutManager(requireContext(), 3));
        binding.rvPhotos.setAdapter(photoAdapter);
    }

    // ------------------------------------------------------------------ //
    //  History list setup                                                 //
    // ------------------------------------------------------------------ //

    private void setupHistoryList() {
        identificationAdapter = new IdentificationAdapter();
        identificationAdapter.setOnDeleteListener(item -> confirmDeleteHistoryItem(item));

        binding.rvHistory.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvHistory.setAdapter(identificationAdapter);

        // Pull-to-refresh
        binding.swipeHistory.setColorSchemeColors(
                ContextCompat.getColor(requireContext(), R.color.accent));
        binding.swipeHistory.setOnRefreshListener(
                () -> viewModel.loadHistory(requireContext()));

        // Swipe-to-delete
        new ItemTouchHelper(new ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT) {
            @Override
            public boolean onMove(@NonNull RecyclerView rv,
                                  @NonNull RecyclerView.ViewHolder vh,
                                  @NonNull RecyclerView.ViewHolder target) {
                return false;
            }

            @Override
            public void onSwiped(@NonNull RecyclerView.ViewHolder viewHolder, int direction) {
                int pos = viewHolder.getAdapterPosition();
                if (pos == RecyclerView.NO_ID) return;
                List<Integer> ids = identificationAdapter.getSelectedIds();
                // Swipe targets a specific item — we grab it from the adapter data
                // by re-fetching via historyState. For simplicity we track last
                // known list in the fragment from the observer.
                if (latestHistoryItems != null && pos < latestHistoryItems.size()) {
                    Identification item = latestHistoryItems.get(pos);
                    confirmDeleteHistoryItem(item);
                } else {
                    // Revert visual swipe if we can't determine the item
                    identificationAdapter.notifyItemChanged(pos);
                }
            }
        }).attachToRecyclerView(binding.rvHistory);
    }

    // Latest snapshot of history items used for swipe-to-delete
    private List<Identification> latestHistoryItems = new ArrayList<>();

    // ------------------------------------------------------------------ //
    //  Click listeners                                                    //
    // ------------------------------------------------------------------ //

    private void setupClickListeners() {
        // Add photo
        binding.btnAddPhoto.setOnClickListener(v -> showImageSourceDialog());

        // Identify button — sends first photo in collector
        binding.btnIdentify.setOnClickListener(v -> {
            List<PhotoItem> photos = photoAdapter.getItems();
            if (photos.isEmpty()) {
                Toast.makeText(requireContext(),
                        "Add at least one photo first", Toast.LENGTH_SHORT).show();
                return;
            }
            viewModel.identify(requireContext(), 0, photos.get(0).getTitle());
        });

        // Bulk delete photos (selection mode)
        binding.btnBulkDeletePhotos.setOnClickListener(v -> {
            List<PhotoItem> selected = photoAdapter.getSelectedItems();
            List<PhotoItem> all = new ArrayList<>(photoAdapter.getItems());
            all.removeAll(selected);
            // Rebuild adapter list without selected items
            for (PhotoItem item : new ArrayList<>(photoAdapter.getItems())) {
                if (item.isSelected()) {
                    int idx = photoAdapter.getItems().indexOf(item);
                    if (idx >= 0) photoAdapter.removeItem(idx);
                }
            }
            // Simpler approach: remove by iterating backwards
            List<PhotoItem> items = photoAdapter.getItems();
            for (int i = items.size() - 1; i >= 0; i--) {
                if (items.get(i).isSelected()) photoAdapter.removeItem(i);
            }
            photoAdapter.exitSelectionMode();
            binding.btnBulkDeletePhotos.setVisibility(View.GONE);
        });

        // Bulk delete history
        binding.btnBulkDeleteHistory.setOnClickListener(v -> confirmBulkDeleteHistory());

        // Toggle show/hide history
        binding.btnToggleHistory.setOnClickListener(v -> {
            historyVisible = !historyVisible;
            binding.swipeHistory.setVisibility(historyVisible ? View.VISIBLE : View.GONE);
            binding.btnBulkDeleteHistory.setVisibility(
                    historyVisible ? View.VISIBLE : View.GONE);
            binding.btnToggleHistory.setImageResource(
                    historyVisible ? R.drawable.ic_chevron_up : R.drawable.ic_chevron_down);
        });

        // Retry history load
        binding.btnRetryHistory.setOnClickListener(v -> {
            binding.layoutHistoryError.setVisibility(View.GONE);
            viewModel.loadHistory(requireContext());
        });
    }

    // ------------------------------------------------------------------ //
    //  ViewModel observation                                              //
    // ------------------------------------------------------------------ //

    private void observeViewModel() {
        // Photo list → update adapter
        viewModel.photos.observe(getViewLifecycleOwner(), photoItems -> {
            // Sync adapter's internal list with ViewModel truth
            // The adapter manages its own list via addPhoto/removeItem;
            // here we handle items added by ViewModel (camera/gallery result)
            List<PhotoItem> adapterItems = photoAdapter.getItems();
            if (photoItems != null && photoItems.size() > adapterItems.size()) {
                // New item appended
                PhotoItem newest = photoItems.get(photoItems.size() - 1);
                photoAdapter.addPhoto(newest);
            } else if (photoItems != null && photoItems.size() < adapterItems.size()) {
                // Item removed — full rebind (rare, ViewModel clears)
                adapterItems.clear();
                if (photoItems != null) adapterItems.addAll(photoItems);
                photoAdapter.notifyDataSetChanged();
            }
        });

        // Identify state
        viewModel.identifyState.observe(getViewLifecycleOwner(), state -> {
            if (state instanceof IdentifyViewModel.IdentifyState.Idle) {
                binding.progressIdentify.setVisibility(View.GONE);
                binding.cardResult.setVisibility(View.GONE);

            } else if (state instanceof IdentifyViewModel.IdentifyState.Loading) {
                binding.progressIdentify.setVisibility(View.VISIBLE);
                binding.cardResult.setVisibility(View.GONE);
                binding.btnIdentify.setEnabled(false);

            } else if (state instanceof IdentifyViewModel.IdentifyState.Success) {
                binding.progressIdentify.setVisibility(View.GONE);
                binding.btnIdentify.setEnabled(true);
                IdentificationResult result =
                        ((IdentifyViewModel.IdentifyState.Success) state).result;
                showResultCard(result);

            } else if (state instanceof IdentifyViewModel.IdentifyState.Error) {
                binding.progressIdentify.setVisibility(View.GONE);
                binding.btnIdentify.setEnabled(true);
                String msg = ((IdentifyViewModel.IdentifyState.Error) state).message;
                showIdentifyError(msg);
            }
        });

        // History state
        viewModel.historyState.observe(getViewLifecycleOwner(), state -> {
            if (state instanceof IdentifyViewModel.HistoryState.Loading) {
                binding.layoutHistoryError.setVisibility(View.GONE);
                // swipeRefresh indicator handled by setRefreshing(true) would need
                // manual trigger; just hide error bar

            } else if (state instanceof IdentifyViewModel.HistoryState.Success) {
                binding.swipeHistory.setRefreshing(false);
                binding.layoutHistoryError.setVisibility(View.GONE);
                List<Identification> items =
                        ((IdentifyViewModel.HistoryState.Success) state).items;
                latestHistoryItems = items;
                identificationAdapter.setData(items);

            } else if (state instanceof IdentifyViewModel.HistoryState.Error) {
                binding.swipeHistory.setRefreshing(false);
                binding.layoutHistoryError.setVisibility(View.VISIBLE);
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Result card                                                        //
    // ------------------------------------------------------------------ //

    private void showResultCard(IdentificationResult result) {
        binding.cardResult.setVisibility(View.VISIBLE);

        binding.tvResultSpecies.setText(
                getString(R.string.species_result, result.getTopResult()));
        binding.tvResultConfidence.setText(
                String.format(Locale.US, "%.1f%%", result.getTopConfidence()));

        scoreAdapter = new ScoreAdapter(result.getScores());
        binding.rvScores.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvScores.setAdapter(scoreAdapter);
    }

    private void showIdentifyError(String message) {
        // Show a toast with the error and a retry option via a dialog
        new AlertDialog.Builder(requireContext())
                .setTitle(R.string.network_error)
                .setMessage(message)
                .setPositiveButton(R.string.retry, (d, w) -> {
                    List<PhotoItem> photos = photoAdapter.getItems();
                    if (!photos.isEmpty()) {
                        viewModel.identify(requireContext(), 0, photos.get(0).getTitle());
                    }
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    // ------------------------------------------------------------------ //
    //  Photo detail dialog                                                //
    // ------------------------------------------------------------------ //

    private void showPhotoDetailDialog(int position, PhotoItem item) {
        String[] options = {
                getString(R.string.rename),
                getString(R.string.send_to_identify),
                getString(R.string.delete)
        };

        new AlertDialog.Builder(requireContext())
                .setItems(options, (dialog, which) -> {
                    switch (which) {
                        case 0: showRenamePhotoDialog(position, item); break;
                        case 1: viewModel.identify(requireContext(), position,
                                item.getTitle()); break;
                        case 2: {
                            viewModel.removePhoto(position);
                            // Sync adapter
                            photoAdapter.removeItem(position);
                            if (photoAdapter.getItems().isEmpty()) {
                                photoAdapter.exitSelectionMode();
                                binding.btnBulkDeletePhotos.setVisibility(View.GONE);
                            }
                            break;
                        }
                    }
                })
                .show();
    }

    private void showRenamePhotoDialog(int position, PhotoItem item) {
        EditText et = new EditText(requireContext());
        et.setText(item.getTitle());

        new AlertDialog.Builder(requireContext())
                .setTitle(R.string.rename)
                .setView(et)
                .setPositiveButton(android.R.string.ok, (d, w) -> {
                    String newTitle = et.getText().toString().trim();
                    item.setTitle(newTitle);
                    // If this photo already has a server-side ID we can update the title;
                    // for new photos just store the title locally in the PhotoItem.
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    // ------------------------------------------------------------------ //
    //  History deletion                                                   //
    // ------------------------------------------------------------------ //

    private void confirmDeleteHistoryItem(Identification item) {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete,
                        (d, w) -> viewModel.deleteHistoryItem(requireContext(), item.getId()))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void confirmBulkDeleteHistory() {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_bulk_delete)
                .setPositiveButton(R.string.delete,
                        (d, w) -> viewModel.deleteAllHistory(requireContext()))
                .setNegativeButton(R.string.cancel, null)
                .show();
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
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
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
            Toast.makeText(requireContext(),
                    "Could not create image file", Toast.LENGTH_SHORT).show();
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
}
