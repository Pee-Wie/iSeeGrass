package com.iseegrass.native_app.ui.identify;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.location.Location;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatDialog;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.bumptech.glide.Glide;
import com.iseegrass.native_app.R;
import com.iseegrass.native_app.databinding.FragmentIdentifyBinding;
import com.iseegrass.native_app.model.CatalogEntry;
import com.iseegrass.native_app.model.GenericResponse;
import com.iseegrass.native_app.model.Identification;
import com.iseegrass.native_app.model.IdentificationResult;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.function.Consumer;

public class IdentifyFragment extends Fragment {

    private static final int MAX_PHOTOS = 12;

    private FragmentIdentifyBinding binding;
    private IdentifyViewModel viewModel;
    private PhotoAdapter photoAdapter;
    private IdentificationAdapter identificationAdapter;
    private Uri cameraImageUri;
    private boolean historyDrawerOpen;

    // Current result state — needed for flag submission
    private Integer currentIdentificationId = null;
    private String  currentModelPrediction  = null;
    private Double  currentModelConfidence  = null;
    private boolean resultFlagged           = false;
    private boolean showingManualResult     = false;

    private ActivityResultLauncher<Intent> cameraLauncher;
    private ActivityResultLauncher<String> galleryLauncher;
    private ActivityResultLauncher<String> cameraPermissionLauncher;
    private ActivityResultLauncher<String[]> locationPermissionLauncher;
    private Consumer<Location> pendingLocationAction;

    // Network callback — fires the moment connectivity is restored
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

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
                             ViewGroup container, Bundle savedInstanceState) {
        binding = FragmentIdentifyBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        viewModel = new ViewModelProvider(this).get(IdentifyViewModel.class);
        viewModel.restorePhotos(requireContext());
        setupPhotoGrid();
        setupHistoryDrawer();
        setupTitleKeyboardBehavior();
        setupClickListeners();
        observeViewModel();
        setupNetworkCallback();
        // Refresh pending count on start so banner shows if there are leftovers
        viewModel.refreshPendingCount(requireContext());
    }

    @Override
    public void onResume() {
        super.onResume();
        viewModel.refreshPendingCount(requireContext());
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        // Unregister network callback to avoid leaks
        if (connectivityManager != null && networkCallback != null) {
            try { connectivityManager.unregisterNetworkCallback(networkCallback); }
            catch (Exception ignored) { }
        }
        binding = null;
    }

    // ------------------------------------------------------------------ //
    //  Launchers                                                          //
    // ------------------------------------------------------------------ //

    private void registerActivityResultLaunchers() {
        cameraLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == android.app.Activity.RESULT_OK
                            && cameraImageUri != null) {
                        if (photoAdapter.getItems().size() < MAX_PHOTOS) {
                            viewModel.addPhoto(requireContext(), cameraImageUri, "");
                        } else {
                            showGridFullToast();
                        }
                    }
                });

        galleryLauncher = registerForActivityResult(
                new ActivityResultContracts.GetMultipleContents(),
                uris -> {
                    if (uris == null || uris.isEmpty()) return;
                    int slots = MAX_PHOTOS - photoAdapter.getItems().size();
                    if (slots <= 0) { showGridFullToast(); return; }
                    int added = 0;
                    for (Uri uri : uris) {
                        if (added >= slots) break;
                        viewModel.addPhoto(requireContext(), uri, "");
                        added++;
                    }
                    if (uris.size() > slots)
                        Toast.makeText(requireContext(),
                                "Only " + slots + " photo(s) added — grid limit reached",
                                Toast.LENGTH_SHORT).show();
                });

        cameraPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> {
                    if (granted) launchCamera();
                    else Toast.makeText(requireContext(),
                            "Camera permission is required", Toast.LENGTH_SHORT).show();
                });

        locationPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                result -> {
                    Consumer<Location> action = pendingLocationAction;
                    pendingLocationAction = null;
                    if (action == null || !isAdded()) return;
                    DeviceLocationProvider.getCurrentLocation(requireContext(), action);
                });
    }

    // ------------------------------------------------------------------ //
    //  Setup                                                              //
    // ------------------------------------------------------------------ //

    private void setupPhotoGrid() {
        photoAdapter = new PhotoAdapter();

        // Tap → blue highlight, drives button states
        photoAdapter.setOnPhotoSelectListener(selectedIndex -> {
            if (binding == null) return;
            binding.btnIdentify.setEnabled(selectedIndex >= 0);
            updateManualButtonState(selectedIndex);
            updateActionBarButtons(selectedIndex);
        });
        updateManualButtonState(-1);

        // Long-press → preview fullscreen
        photoAdapter.setOnPhotoLongClickListener((position, item) ->
                showFullscreenPreview(item.getImageUri()));

        binding.rvPhotos.setLayoutManager(new GridLayoutManager(requireContext(), 3));
        binding.rvPhotos.setAdapter(photoAdapter);
    }

    private void setupHistoryDrawer() {
        identificationAdapter = new IdentificationAdapter();
        identificationAdapter.setOnDeleteListener(this::confirmDeleteHistoryItem);
        identificationAdapter.setOnItemClickListener(item -> {
            viewModel.showHistoryItemResult(requireContext(), item);
            setHistoryDrawerOpen(false);
        });
        binding.rvHistory.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvHistory.setAdapter(identificationAdapter);
        FragmentIdentifyBinding drawerBinding = binding;
        drawerBinding.historyDrawer.post(() -> drawerBinding.historyDrawer.setTranslationX(
                getHistoryDrawerCollapsedOffset()));
        binding.btnHistoryToggle.setOnClickListener(v ->
                setHistoryDrawerOpen(!historyDrawerOpen));
        binding.btnBulkDeleteHistory.setOnClickListener(v -> confirmBulkDeleteHistory());
        binding.btnRetryHistory.setOnClickListener(v ->
                viewModel.loadHistory(requireContext()));
    }

    private void setupTitleKeyboardBehavior() {
        View root = binding.getRoot();
        binding.etTitle.setOnFocusChangeListener((view, hasFocus) ->
                ViewCompat.requestApplyInsets(root));
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            int imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
            int navigationBottom = insets.getInsets(
                    WindowInsetsCompat.Type.navigationBars()).bottom;
            int keyboardHeight = Math.max(0, imeBottom - navigationBottom);
            int lift = 0;
            if (binding.etTitle.hasFocus() && keyboardHeight > 0) {
                lift = Math.max(0, keyboardHeight - binding.barActions.getHeight()
                        + Math.round(8 * getResources().getDisplayMetrics().density));
            }

            ConstraintLayout.LayoutParams params =
                    (ConstraintLayout.LayoutParams) binding.tilTitle.getLayoutParams();
            if (params.bottomMargin != lift) {
                params.bottomMargin = lift;
                binding.tilTitle.setLayoutParams(params);
            }
            return insets;
        });
        ViewCompat.requestApplyInsets(root);
    }

    private void setHistoryDrawerOpen(boolean open) {
        if (binding == null) return;
        historyDrawerOpen = open;
        binding.btnHistoryToggle.setRotation(open ? 0f : 180f);
        binding.btnHistoryToggle.setContentDescription(open
                ? "Close identification history" : "Open identification history");
        binding.historyDrawer.animate()
                .translationX(open ? 0f : getHistoryDrawerCollapsedOffset())
                .setDuration(220)
                .start();
        if (open) viewModel.loadHistory(requireContext());
    }

    private int getHistoryDrawerCollapsedOffset() {
        View toggleRail = (View) binding.btnHistoryToggle.getParent();
        return Math.max(0, binding.historyDrawer.getWidth() - toggleRail.getWidth());
    }

    private void setupClickListeners() {
        // Add Photo / Preview — context-sensitive
        binding.btnAddPhoto.setOnClickListener(v -> {
            int idx = photoAdapter.getSelectedIndex();
            if (idx >= 0) {
                // A photo is selected → Preview mode
                showFullscreenPreview(photoAdapter.getItems().get(idx).getImageUri());
            } else {
                // Normal mode
                showImageSourceDialog();
            }
        });

        // Identify
        binding.btnIdentify.setOnClickListener(v -> {
            int idx = photoAdapter.getSelectedIndex();
            if (idx < 0) {
                Toast.makeText(requireContext(),
                        "Tap a photo to select it first", Toast.LENGTH_SHORT).show();
                return;
            }
            String title = binding.etTitle.getText() != null
                    ? binding.etTitle.getText().toString().trim() : "";
            Uri imageUri = photoAdapter.getItems().get(idx).getImageUri();
            withImageLocation(imageUri, location -> {
                if (!isAdded() || binding == null) return;
                viewModel.identify(
                        requireContext(),
                        idx,
                        title,
                        location != null ? location.getLatitude() : null,
                        location != null ? location.getLongitude() : null);
            });
        });

        // Clear / Remove — context-sensitive
        binding.btnClear.setOnClickListener(v -> {
            int idx = photoAdapter.getSelectedIndex();
            if (idx >= 0) {
                // Remove selected photo
                viewModel.removePhoto(requireContext(), idx);
            } else {
                // Clear all
                viewModel.clearPhotos(requireContext());
                binding.etTitle.setText("");
                showNoResultState();
            }
        });

        // Reset result card
        binding.btnResetResult.setOnClickListener(v -> showNoResultState());

        binding.btnManualIdentify.setOnClickListener(v ->
                new ManualIdentificationDialog(requireContext(), this::showManualResult).show());

        // Flag wrong prediction
        binding.btnFlagResult.setOnClickListener(v -> showFlagDialog());

        // Sync now button on the offline pending banner
        binding.btnSyncNow.setOnClickListener(v -> {
            if (!IdentifyViewModel.isOnline(requireContext())) {
                Toast.makeText(requireContext(),
                        "Still offline — connect to the internet first",
                        Toast.LENGTH_SHORT).show();
                return;
            }
            binding.btnSyncNow.setEnabled(false);
            binding.tvPendingCount.setText("⚡ Syncing…");
            viewModel.syncOfflineQueue(requireContext());
        });
    }

    // ------------------------------------------------------------------ //
    //  Network callback — auto-sync when connectivity restored           //
    // ------------------------------------------------------------------ //

    private void setupNetworkCallback() {
        connectivityManager = (ConnectivityManager)
                requireContext().getSystemService(android.content.Context.CONNECTIVITY_SERVICE);
        if (connectivityManager == null) return;

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                // Runs on a system thread — post to main thread
                if (getView() == null) return;
                requireActivity().runOnUiThread(() -> {
                    if (binding == null) return;
                    // Auto-trigger sync if there are pending records
                    Integer pending = viewModel.pendingCount.getValue();
                    if (pending != null && pending > 0) {
                        binding.tvPendingCount.setText("⚡ Syncing…");
                        binding.btnSyncNow.setEnabled(false);
                        viewModel.syncOfflineQueue(requireContext());
                    }
                });
            }
        };

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        connectivityManager.registerNetworkCallback(request, networkCallback);
    }

    // ------------------------------------------------------------------ //
    //  Button state helpers                                               //
    // ------------------------------------------------------------------ //

    /** Update Add Photo and Clear button labels based on selection and grid size. */
    private void updateActionBarButtons(int selectedIndex) {
        if (binding == null) return;
        boolean hasSelection = selectedIndex >= 0;
        binding.btnClear.setText(hasSelection ? "Remove" : "Clear");
        binding.btnAddPhoto.setText(hasSelection ? "Preview" : "Add Photo");
    }

    private void updateManualButtonState(int selectedIndex) {
        if (binding == null) return;
        boolean hasSelection = selectedIndex >= 0;
        binding.btnManualIdentify.setEnabled(hasSelection);
        binding.btnManualIdentify.setAlpha(hasSelection ? 1f : 0.45f);
    }

    // ------------------------------------------------------------------ //
    //  Fullscreen preview dialog                                          //
    // ------------------------------------------------------------------ //

    private void showFullscreenPreview(Uri imageUri) {
        AppCompatDialog dialog = new AppCompatDialog(requireContext(),
                android.R.style.Theme_Black_NoTitleBar_Fullscreen);

        View v = LayoutInflater.from(requireContext())
                .inflate(R.layout.dialog_fullscreen_preview, null);
        dialog.setContentView(v);

        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT);
        }

        ImageView ivPreview  = v.findViewById(R.id.iv_preview_full);
        ImageButton btnClose = v.findViewById(R.id.btn_close_preview);

        Glide.with(requireContext())
                .load(imageUri)
                .into(ivPreview);

        btnClose.setOnClickListener(x -> dialog.dismiss());
        dialog.show();
    }

    // ------------------------------------------------------------------ //
    //  Image source dialog                                                //
    // ------------------------------------------------------------------ //

    private void showImageSourceDialog() {
        boolean full = photoAdapter.getItems().size() >= MAX_PHOTOS;
        if (full) {
            // Show dialog with disabled options + reminder
            new AlertDialog.Builder(requireContext())
                    .setTitle("Photo Grid Full")
                    .setMessage("You've reached the 12-photo limit.\n\nRemove a photo from the grid before adding a new one — tap a photo to select it, then tap \"Remove\".")
                    .setPositiveButton("Got it", null)
                    .show();
            return;
        }
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

    private void showGridFullToast() {
        Toast.makeText(requireContext(),
                "Grid full — remove a photo before adding new ones",
                Toast.LENGTH_SHORT).show();
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
        try { photoFile = createImageFile(); }
        catch (IOException e) {
            Toast.makeText(requireContext(), "Could not create image file",
                    Toast.LENGTH_SHORT).show();
            return;
        }
        cameraImageUri = FileProvider.getUriForFile(requireContext(),
                requireContext().getPackageName() + ".fileprovider", photoFile);
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri);
        cameraLauncher.launch(intent);
    }

    private File createImageFile() throws IOException {
        String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File dir = requireContext().getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (dir == null) dir = requireContext().getCacheDir();
        if (!dir.exists()) dir.mkdirs();
        return File.createTempFile("IMG_" + ts, ".jpg", dir);
    }

    // ------------------------------------------------------------------ //
    //  ViewModel observation                                              //
    // ------------------------------------------------------------------ //

    private void observeViewModel() {
        viewModel.photos.observe(getViewLifecycleOwner(), photoItems -> {
            if (photoItems != null) {
                photoAdapter.setItems(photoItems);
                int selectedIndex = photoAdapter.getSelectedIndex();
                binding.btnIdentify.setEnabled(selectedIndex >= 0);
                updateManualButtonState(selectedIndex);
                updateActionBarButtons(selectedIndex);
            }
        });

        viewModel.photoPersistenceError.observe(getViewLifecycleOwner(), error -> {
            if (error == null || binding == null) return;
            Toast.makeText(requireContext(), error, Toast.LENGTH_LONG).show();
            viewModel.clearPhotoPersistenceError();
        });

        viewModel.identifyState.observe(getViewLifecycleOwner(), state -> {
            if (state instanceof IdentifyViewModel.IdentifyState.Loading) {
                binding.progressIdentify.setVisibility(View.VISIBLE);
                binding.btnIdentify.setEnabled(false);
                photoAdapter.clearSelection();
                updateManualButtonState(-1);
                updateActionBarButtons(-1);
                showNoResultState();

            } else if (state instanceof IdentifyViewModel.IdentifyState.Success) {
                binding.progressIdentify.setVisibility(View.GONE);
                binding.btnIdentify.setEnabled(false);
                IdentifyViewModel.IdentifyState.Success success =
                        (IdentifyViewModel.IdentifyState.Success) state;
                IdentificationResult result = success.result;
                boolean isOffline = success.isOffline;
                boolean isManual = "manual_key".equals(result.getIdentificationMethod());

                // Capture for flag submission — offline results have no server id, disable flag
                currentIdentificationId = result.getIdentificationId() > 0
                        ? result.getIdentificationId() : null;
                currentModelPrediction  = isManual ? null : result.getTopResult();
                currentModelConfidence  = result.getTopConfidence();
                resultFlagged           = false;

                // Flag is only meaningful for server-saved results
                binding.btnFlagResult.setVisibility(isOffline || isManual
                        ? View.GONE : View.VISIBLE);
                updateFlagButton(false);

                // Offline badge
                binding.tvOfflineBadge.setVisibility(isOffline ? View.VISIBLE : View.GONE);

                if (isManual) {
                    showSavedManualResult(result.getTopResult());
                } else {
                    showResultScientific(result.getTopResult());
                }

            } else if (state instanceof IdentifyViewModel.IdentifyState.Error) {
                binding.progressIdentify.setVisibility(View.GONE);
                binding.btnIdentify.setEnabled(photoAdapter.getSelectedIndex() >= 0);
                IdentifyViewModel.IdentifyState.Error error =
                        (IdentifyViewModel.IdentifyState.Error) state;
                showIdentifyError(error.message, error.retryAction);

            } else {
                binding.progressIdentify.setVisibility(View.GONE);
            }
        });

        viewModel.catalogState.observe(getViewLifecycleOwner(), state -> {
            if (binding == null) return;
            if (showingManualResult) return;
            if (state instanceof IdentifyViewModel.CatalogState.Success) {
                enrichResultCard(((IdentifyViewModel.CatalogState.Success) state).entry);
            } else if (state instanceof IdentifyViewModel.CatalogState.NotFound) {
                if (binding.tvResultScientific.getVisibility() == View.VISIBLE
                        && !isBackgroundResult(binding.tvResultScientific.getText().toString())) {
                    showCommonAndDescription("—", "No catalog entry found for this species.");
                }
            }
        });

        viewModel.historyState.observe(getViewLifecycleOwner(), state -> {
            if (binding == null) return;
            if (state instanceof IdentifyViewModel.HistoryState.Loading) {
                binding.progressHistory.setVisibility(View.VISIBLE);
                binding.layoutHistoryError.setVisibility(View.GONE);
                binding.tvHistoryEmpty.setVisibility(View.GONE);
            } else if (state instanceof IdentifyViewModel.HistoryState.Success) {
                List<Identification> items =
                        ((IdentifyViewModel.HistoryState.Success) state).items;
                identificationAdapter.setData(items);
                binding.progressHistory.setVisibility(View.GONE);
                binding.layoutHistoryError.setVisibility(View.GONE);
                binding.tvHistoryEmpty.setVisibility(items.isEmpty() ? View.VISIBLE : View.GONE);
            } else if (state instanceof IdentifyViewModel.HistoryState.Error) {
                binding.progressHistory.setVisibility(View.GONE);
                binding.layoutHistoryError.setVisibility(View.VISIBLE);
                binding.tvHistoryEmpty.setVisibility(View.GONE);
                binding.tvHistoryError.setText(
                        ((IdentifyViewModel.HistoryState.Error) state).message);
            }
        });

        // Offline pending sync banner
        viewModel.pendingCount.observe(getViewLifecycleOwner(), count -> {
            if (binding == null) return;
            if (count != null && count > 0) {
                binding.barOfflineSync.setVisibility(View.VISIBLE);
                binding.tvPendingCount.setText(
                        "⚡ " + count + " offline result" + (count == 1 ? "" : "s")
                        + " pending sync");
                binding.btnSyncNow.setEnabled(true);
            } else {
                binding.barOfflineSync.setVisibility(View.GONE);
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Result card helpers                                                //
    // ------------------------------------------------------------------ //

    private void showNoResultState() {
        if (binding == null) return;
        binding.tvResultPlaceholder.setVisibility(View.VISIBLE);
        binding.tvResultScientific.setVisibility(View.GONE);
        binding.tvResultCommon.setVisibility(View.GONE);
        binding.tvResultDescription.setVisibility(View.GONE);
        binding.tvOfflineBadge.setVisibility(View.GONE);
        binding.tvManualBadge.setVisibility(View.GONE);
        showingManualResult = false;
        // Restore flag button visibility (hidden for offline results)
        binding.btnFlagResult.setVisibility(View.VISIBLE);
        // Reset flag state
        currentIdentificationId = null;
        currentModelPrediction  = null;
        currentModelConfidence  = null;
        resultFlagged           = false;
        updateFlagButton(false);
    }

    private static final String BACKGROUND_SUBSTRATE = "Background Substrate";

    private boolean isBackgroundResult(String name) {
        return name == null || name.trim().equalsIgnoreCase(BACKGROUND_SUBSTRATE);
    }

    private void showResultScientific(String scientificName) {
        if (binding == null) return;
        showingManualResult = false;
        binding.tvManualBadge.setVisibility(View.GONE);
        binding.tvResultPlaceholder.setVisibility(View.GONE);
        if (isBackgroundResult(scientificName)) {
            binding.tvResultScientific.setText("No seagrass detected");
            binding.tvResultScientific.setVisibility(View.VISIBLE);
            binding.tvResultCommon.setText(
                    "The image may show substrate, open water, or be too blurry for classification.");
            binding.tvResultCommon.setVisibility(View.VISIBLE);
            binding.tvResultDescription.setText(
                    "Try recapturing with better lighting, focused directly on the seagrass bed. "
                    + "Ensure the plant fills most of the frame.");
            binding.tvResultDescription.setVisibility(View.VISIBLE);
        } else {
            binding.tvResultScientific.setText(scientificName);
            binding.tvResultScientific.setVisibility(View.VISIBLE);
            binding.tvResultCommon.setText("…");
            binding.tvResultCommon.setVisibility(View.VISIBLE);
            binding.tvResultDescription.setText("…");
            binding.tvResultDescription.setVisibility(View.VISIBLE);
        }
    }

    private void enrichResultCard(CatalogEntry entry) {
        if (binding == null) return;
        showCommonAndDescription(
                entry.getCommonName() != null && !entry.getCommonName().isEmpty()
                        ? entry.getCommonName() : "—",
                entry.getDescription() != null && !entry.getDescription().isEmpty()
                        ? entry.getDescription() : "—");
    }

    private void showManualResult(ManualIdentificationKey.Outcome outcome) {
        if (binding == null || outcome == null || !outcome.hasMatch()) return;
        int selectedIndex = photoAdapter.getSelectedIndex();
        if (selectedIndex < 0) {
            Toast.makeText(requireContext(),
                    "Select a photo before saving a manual identification.",
                    Toast.LENGTH_SHORT).show();
            return;
        }
        String title = binding.etTitle.getText() != null
                ? binding.etTitle.getText().toString().trim() : "";
        Uri imageUri = photoAdapter.getItems().get(selectedIndex).getImageUri();
        withImageLocation(imageUri, location -> {
            if (!isAdded() || binding == null) return;
            viewModel.identifyManually(
                    requireContext(),
                    selectedIndex,
                    title,
                    outcome.getScientificName(),
                    location != null ? location.getLatitude() : null,
                    location != null ? location.getLongitude() : null);
        });
    }

    private void withImageLocation(Uri imageUri, Consumer<Location> action) {
        DeviceLocationProvider.getExifLocation(requireContext(), imageUri, imageLocation -> {
            if (!isAdded()) return;
            if (imageLocation != null) {
                action.accept(imageLocation);
            } else {
                withCurrentLocation(action);
            }
        });
    }

    private void withCurrentLocation(Consumer<Location> action) {
        if (DeviceLocationProvider.hasPermission(requireContext())) {
            DeviceLocationProvider.getCurrentLocation(requireContext(), action);
            return;
        }
        pendingLocationAction = action;
        locationPermissionLauncher.launch(new String[]{
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
        });
    }

    private void showSavedManualResult(String scientificName) {
        if (binding == null) return;
        showingManualResult = true;
        binding.tvResultPlaceholder.setVisibility(View.GONE);
        binding.tvResultScientific.setText(scientificName);
        binding.tvResultScientific.setVisibility(View.VISIBLE);
        binding.tvManualBadge.setVisibility(View.VISIBLE);
        binding.tvResultCommon.setText("Manual identification — no model confidence score");
        binding.tvResultCommon.setVisibility(View.VISIBLE);
        binding.tvResultDescription.setText(
                "Saved from the Indo-Pacific manual key. Confirm the result with a regional "
                        + "field guide; no CNN confidence was generated.");
        binding.tvResultDescription.setVisibility(View.VISIBLE);
    }

    private void showCommonAndDescription(String common, String desc) {
        if (binding == null) return;
        binding.tvResultCommon.setText(common);
        binding.tvResultCommon.setVisibility(View.VISIBLE);
        binding.tvResultDescription.setText(desc);
        binding.tvResultDescription.setVisibility(View.VISIBLE);
    }

    private void showIdentifyError(String message, Runnable retryAction) {
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext())
                .setTitle(R.string.network_error)
                .setMessage(message);
        if (retryAction != null) {
            builder.setPositiveButton(R.string.retry, (d, w) -> retryAction.run())
                    .setNegativeButton(android.R.string.cancel, null);
        } else {
            builder.setPositiveButton(android.R.string.ok, null);
        }
        builder.show();
    }

    // ------------------------------------------------------------------ //
    //  Photo detail (long-press kept for rename)                         //
    // ------------------------------------------------------------------ //

    private void showPhotoDetailDialog(int position, PhotoItem item) {
        new AlertDialog.Builder(requireContext())
                .setItems(new CharSequence[]{
                        getString(R.string.rename),
                        getString(R.string.delete)
                }, (dialog, which) -> {
                    switch (which) {
                        case 0: showRenamePhotoDialog(position, item); break;
                        case 1:
                            viewModel.removePhoto(requireContext(), position);
                            break;
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
                .setPositiveButton(android.R.string.ok,
                        (d, w) -> viewModel.renamePhoto(requireContext(), item,
                                et.getText().toString().trim()))
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    // ------------------------------------------------------------------ //
    //  Flag wrong prediction                                              //
    // ------------------------------------------------------------------ //

    private void updateFlagButton(boolean flagged) {
        if (binding == null) return;
        binding.btnFlagResult.setImageResource(R.drawable.ic_flag);
        int color = flagged
                ? getResources().getColor(android.R.color.holo_red_light, null)
                : getResources().getColor(R.color.off_white, null);
        binding.btnFlagResult.setColorFilter(color);
        binding.btnFlagResult.setEnabled(!flagged);
        binding.btnFlagResult.setAlpha(flagged ? 0.6f : 1.0f);
    }

    private void showFlagDialog() {
        if (currentModelPrediction == null || currentIdentificationId == null) {
            Toast.makeText(requireContext(),
                    "No result to flag — run an identification first",
                    Toast.LENGTH_SHORT).show();
            return;
        }
        if (resultFlagged) {
            Toast.makeText(requireContext(),
                    "Already flagged", Toast.LENGTH_SHORT).show();
            return;
        }

        // Build dialog with two input fields
        android.widget.LinearLayout container = new android.widget.LinearLayout(requireContext());
        container.setOrientation(android.widget.LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        container.setPadding(pad, pad / 2, pad, 0);

        EditText etCorrection = new EditText(requireContext());
        etCorrection.setHint("What species did you actually see? (optional)");
        etCorrection.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
        etCorrection.setMaxLines(1);
        android.widget.LinearLayout.LayoutParams lp =
                new android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = pad / 2;
        container.addView(etCorrection, lp);

        EditText etNotes = new EditText(requireContext());
        etNotes.setHint("Notes (optional) — e.g. image was blurry");
        etNotes.setInputType(android.text.InputType.TYPE_CLASS_TEXT
                | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        etNotes.setMaxLines(3);
        container.addView(etNotes,
                new android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));

        final String[] manualKeySpecies = {null};
        com.google.android.material.button.MaterialButton manualKeyButton =
                new com.google.android.material.button.MaterialButton(requireContext());
        manualKeyButton.setText("Use manual identification key");
        manualKeyButton.setOnClickListener(v -> new ManualIdentificationDialog(
                requireContext(), outcome -> {
                    manualKeySpecies[0] = outcome.getScientificName();
                    etCorrection.setText(manualKeySpecies[0]);
                }).show());
        android.widget.LinearLayout.LayoutParams keyButtonParams =
                new android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        keyButtonParams.topMargin = pad / 2;
        container.addView(manualKeyButton, keyButtonParams);

        new AlertDialog.Builder(requireContext())
                .setTitle("Flag Wrong Prediction")
                .setMessage("The model predicted: " + currentModelPrediction
                        + "\n\nTell us what you actually observed (optional).")
                .setView(container)
                .setPositiveButton("Submit Flag", (d, w) -> {
                    String correction = etCorrection.getText().toString().trim();
                    String notes      = etNotes.getText().toString().trim();
                    if (manualKeySpecies[0] != null
                            && manualKeySpecies[0].equals(correction)) {
                        viewModel.manuallyCorrectIdentification(requireContext(),
                                currentIdentificationId, correction, notes,
                                (saved, message) -> {
                                    if (binding == null) return;
                                    if (saved) {
                                        resultFlagged = true;
                                        updateFlagButton(true);
                                    }
                                    Toast.makeText(requireContext(), message,
                                            Toast.LENGTH_SHORT).show();
                                });
                    } else {
                        submitFlag(
                                correction.isEmpty() ? null : correction,
                                notes.isEmpty() ? null : notes);
                    }
                })
                .setNegativeButton(android.R.string.cancel, null)
                .show();
    }

    private void submitFlag(String userCorrection, String notes) {
        com.iseegrass.native_app.model.FlagRequest req =
                new com.iseegrass.native_app.model.FlagRequest(
                        currentIdentificationId,
                        currentModelPrediction,
                        currentModelConfidence,
                        userCorrection,
                        notes);

        com.iseegrass.native_app.network.ApiClient
                .getInstance(requireContext())
                .getApiService()
                .flagIdentification(req)
                .enqueue(new retrofit2.Callback<GenericResponse>() {
                    @Override
                    public void onResponse(retrofit2.Call<GenericResponse> call,
                                           retrofit2.Response<GenericResponse> response) {
                        if (binding == null) return;
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            resultFlagged = true;
                            updateFlagButton(true);
                            Toast.makeText(requireContext(),
                                    "Flagged — thank you for the feedback",
                                    Toast.LENGTH_SHORT).show();
                        } else if (response.code() == 409) {
                            Toast.makeText(requireContext(),
                                    "Already flagged", Toast.LENGTH_SHORT).show();
                        } else {
                            Toast.makeText(requireContext(),
                                    "Failed to submit flag", Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(retrofit2.Call<GenericResponse> call, Throwable t) {
                        if (binding == null) return;
                        Toast.makeText(requireContext(),
                                "Network error — flag not submitted",
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void confirmDeleteHistoryItem(Identification item) {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_delete)
                .setPositiveButton(R.string.delete,
                        (dialog, which) -> viewModel.deleteHistoryItem(
                                requireContext(), item.getId()))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void confirmBulkDeleteHistory() {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.confirm_bulk_delete)
                .setPositiveButton(R.string.delete,
                        (dialog, which) -> viewModel.deleteAllHistory(requireContext()))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }
}
