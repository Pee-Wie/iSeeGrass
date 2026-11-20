package com.iseegrass.native_app.ui.identify;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.iseegrass.native_app.model.AppDatabase;
import com.iseegrass.native_app.model.CatalogEntry;
import com.iseegrass.native_app.model.CatalogResponse;
import com.iseegrass.native_app.model.GenericResponse;
import com.iseegrass.native_app.model.HistoryResponse;
import com.iseegrass.native_app.model.Identification;
import com.iseegrass.native_app.model.IdentificationResult;
import com.iseegrass.native_app.model.IdentifyResponse;
import com.iseegrass.native_app.model.OfflineIdentification;
import com.iseegrass.native_app.model.UpdateTitleRequest;
import com.iseegrass.native_app.network.ApiClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * ViewModel for the Identification module.
 *
 * Identify flow:
 *   Online  → call /api/identify; on success save to server (as before); result is ONLINE.
 *   Offline or server failure → run TFLite on-device; save result locally (PENDING queue);
 *                               trigger sync when connectivity returns.
 *
 * LiveData streams:
 *   identifyState  — progress / result / error for a single identify call
 *   catalogState   — loading / entry / error for the catalog lookup after identify
 *   historyState   — loading / list / error for the ID history list
 */
public class IdentifyViewModel extends ViewModel {

    private static final String TAG = "IdentifyViewModel";
    private static final String PHOTO_PREFS = "photo_collector";
    private static final String PHOTO_LIST_KEY = "photos";
    private static final String PHOTO_DIRECTORY = "photo-collector";

    private final ExecutorService bgExecutor = Executors.newSingleThreadExecutor();

    // ------------------------------------------------------------------ //
    //  State classes                                                      //
    // ------------------------------------------------------------------ //

    public static abstract class IdentifyState {
        public static final class Idle    extends IdentifyState { }
        public static final class Loading extends IdentifyState { }
        public static final class Success extends IdentifyState {
            public final IdentificationResult result;
            /** true when the result came from on-device TFLite (not saved to server yet). */
            public final boolean isOffline;
            public Success(IdentificationResult r, boolean offline) {
                this.result    = r;
                this.isOffline = offline;
            }
        }
        public static final class Error extends IdentifyState {
            public final String message;
            public final Runnable retryAction;
            public Error(String m) { this(m, null); }
            public Error(String m, Runnable retryAction) {
                this.message = m;
                this.retryAction = retryAction;
            }
        }
    }

    public static abstract class CatalogState {
        public static final class Idle     extends CatalogState { }
        public static final class Loading  extends CatalogState { }
        public static final class Success  extends CatalogState {
            public final CatalogEntry entry;
            public Success(CatalogEntry e) { this.entry = e; }
        }
        public static final class NotFound extends CatalogState { }
        public static final class Error    extends CatalogState { }
    }

    public static abstract class HistoryState {
        public static final class Loading extends HistoryState { }
        public static final class Success extends HistoryState {
            public final List<Identification> items;
            public Success(List<Identification> items) { this.items = items; }
        }

        public static final class Error extends HistoryState {
            public final String message;
            public Error(String m) { this.message = m; }
        }
    }

    public interface ManualSaveCallback {
        void onComplete(boolean saved, String message);
    }

    // ------------------------------------------------------------------ //
    //  LiveData                                                           //
    // ------------------------------------------------------------------ //

    private final MutableLiveData<List<PhotoItem>> _photos =
            new MutableLiveData<>(new ArrayList<>());
    public final LiveData<List<PhotoItem>> photos = _photos;
    private final MutableLiveData<String> _photoPersistenceError = new MutableLiveData<>();
    public final LiveData<String> photoPersistenceError = _photoPersistenceError;
    private final Object photoLock = new Object();
    private boolean photosRestored;

    private final MutableLiveData<IdentifyState> _identifyState =
            new MutableLiveData<>(new IdentifyState.Idle());
    public final LiveData<IdentifyState> identifyState = _identifyState;

    private final MutableLiveData<CatalogState> _catalogState =
            new MutableLiveData<>(new CatalogState.Idle());
    public final LiveData<CatalogState> catalogState = _catalogState;

    private final MutableLiveData<HistoryState> _historyState = new MutableLiveData<>();
    public final LiveData<HistoryState> historyState = _historyState;

    /** Number of locally-saved offline results still waiting to be synced. */
    private final MutableLiveData<Integer> _pendingCount = new MutableLiveData<>(0);
    public final LiveData<Integer> pendingCount = _pendingCount;

    // ------------------------------------------------------------------ //
    //  Photo-collector mutations                                          //
    // ------------------------------------------------------------------ //

    public void restorePhotos(Context context) {
        synchronized (photoLock) {
            if (photosRestored) return;
            List<PhotoItem> restored = new ArrayList<>();
            String encoded = context.getApplicationContext()
                    .getSharedPreferences(PHOTO_PREFS, Context.MODE_PRIVATE)
                    .getString(PHOTO_LIST_KEY, "[]");
            try {
                JSONArray saved = new JSONArray(encoded);
                for (int i = 0; i < saved.length(); i++) {
                    JSONObject entry = saved.getJSONObject(i);
                    Uri uri = Uri.parse(entry.getString("uri"));
                    if (!"file".equals(uri.getScheme())) continue;
                    File file = new File(uri.getPath());
                    if (!file.isFile()) continue;
                    restored.add(new PhotoItem(uri, entry.optString("title", "")));
                }
            } catch (JSONException e) {
                Log.e(TAG, "Could not restore saved photo collector entries.", e);
                context.getApplicationContext()
                        .getSharedPreferences(PHOTO_PREFS, Context.MODE_PRIVATE)
                        .edit().remove(PHOTO_LIST_KEY).apply();
            }
            photosRestored = true;
            _photos.setValue(restored);
            persistPhotoCollector(context, restored);
        }
    }

    public void addPhoto(Context context, Uri uri, String title) {
        if (uri == null) return;
        PhotoItem item = new PhotoItem(uri, title);
        synchronized (photoLock) {
            List<PhotoItem> current = getPhotoList();
            current.add(item);
            _photos.setValue(current);
            persistPhotoCollector(context, current);
        }
        Context appContext = context.getApplicationContext();
        bgExecutor.execute(() -> {
            File copiedFile = null;
            try {
                copiedFile = copyPhotoIntoCollector(appContext, uri);
                synchronized (photoLock) {
                    List<PhotoItem> latest = getPhotoList();
                    if (!latest.contains(item)) {
                        copiedFile.delete();
                        return;
                    }
                    item.setImageUri(Uri.fromFile(copiedFile));
                    persistPhotoCollector(appContext, latest);
                    _photos.postValue(new ArrayList<>(latest));
                }
            } catch (IOException e) {
                Log.e(TAG, "Could not persist a photo collector image.", e);
                if (copiedFile != null) copiedFile.delete();
                synchronized (photoLock) {
                    List<PhotoItem> latest = getPhotoList();
                    latest.remove(item);
                    persistPhotoCollector(appContext, latest);
                    _photos.postValue(new ArrayList<>(latest));
                }
                _photoPersistenceError.postValue(
                        "A photo could not be saved and was removed from the collector.");
            }
        });
    }

    public void removePhoto(Context context, int index) {
        synchronized (photoLock) {
            List<PhotoItem> current = getPhotoList();
            if (index >= 0 && index < current.size()) {
                PhotoItem removed = current.remove(index);
                deleteCollectorFile(context, removed.getImageUri());
                _photos.setValue(current);
                persistPhotoCollector(context, current);
            }
        }
    }

    public void clearPhotos(Context context) {
        synchronized (photoLock) {
            List<PhotoItem> current = getPhotoList();
            for (PhotoItem item : current) deleteCollectorFile(context, item.getImageUri());
            List<PhotoItem> empty = new ArrayList<>();
            _photos.setValue(empty);
            persistPhotoCollector(context, empty);
        }
    }

    private List<PhotoItem> getPhotoList() {
        List<PhotoItem> current = _photos.getValue();
        return current != null ? new ArrayList<>(current) : new ArrayList<>();
    }

    public void renamePhoto(Context context, PhotoItem item, String title) {
        synchronized (photoLock) {
            if (!getPhotoList().contains(item)) return;
            item.setTitle(title);
            List<PhotoItem> current = getPhotoList();
            persistPhotoCollector(context, current);
            _photos.setValue(current);
        }
    }

    public void clearPhotoPersistenceError() {
        _photoPersistenceError.setValue(null);
    }

    private File copyPhotoIntoCollector(Context context, Uri source) throws IOException {
        File directory = new File(context.getFilesDir(), PHOTO_DIRECTORY);
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IOException("Could not create photo collector storage.");
        }
        File destination = new File(directory, UUID.randomUUID().toString() + ".img");
        File temporary = new File(directory, destination.getName() + ".tmp");
        try (InputStream input = context.getContentResolver().openInputStream(source);
             FileOutputStream output = new FileOutputStream(temporary)) {
            if (input == null) throw new IOException("Cannot open photo URI: " + source);
            byte[] buffer = new byte[16 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            output.getFD().sync();
        } catch (IOException e) {
            temporary.delete();
            throw e;
        }
        if (!temporary.renameTo(destination)) {
            temporary.delete();
            throw new IOException("Could not finish saving photo collector image.");
        }
        return destination;
    }

    private void persistPhotoCollector(Context context, List<PhotoItem> photos) {
        JSONArray saved = new JSONArray();
        for (PhotoItem item : photos) {
            if (item.getImageUri() == null
                    || !"file".equals(item.getImageUri().getScheme())) continue;
            JSONObject entry = new JSONObject();
            try {
                entry.put("uri", item.getImageUri().toString());
                entry.put("title", item.getTitle());
                saved.put(entry);
            } catch (JSONException e) {
                Log.e(TAG, "Could not serialize photo collector entry.", e);
            }
        }
        context.getApplicationContext()
                .getSharedPreferences(PHOTO_PREFS, Context.MODE_PRIVATE)
                .edit().putString(PHOTO_LIST_KEY, saved.toString()).apply();
    }

    private void deleteCollectorFile(Context context, Uri uri) {
        if (uri == null || !"file".equals(uri.getScheme())) return;
        File file = new File(uri.getPath());
        File directory = new File(context.getApplicationContext().getFilesDir(), PHOTO_DIRECTORY);
        try {
            if (file.getCanonicalFile().getParentFile().equals(directory.getCanonicalFile())) {
                file.delete();
            }
        } catch (IOException e) {
            Log.e(TAG, "Could not resolve persisted photo path for cleanup.", e);
        }
    }

    // ------------------------------------------------------------------ //
    //  Identify — primary entry point                                     //
    // ------------------------------------------------------------------ //

    /**
     * Runs identification for the photo at {@code photoIndex}.
     *
     * Online path  → server API → save to DB → load history.
     * Offline/fail → TFLite    → save locally → queue for sync.
     */
    public void identify(Context ctx, int photoIndex, String title,
                         Double latitude, Double longitude) {
        List<PhotoItem> photoList = getPhotoList();
        if (photoIndex < 0 || photoIndex >= photoList.size()) {
            _identifyState.setValue(new IdentifyState.Error("No photo at index " + photoIndex));
            return;
        }

        _identifyState.setValue(new IdentifyState.Loading());
        _catalogState.setValue(new CatalogState.Idle());

        Uri uri = photoList.get(photoIndex).getImageUri();

        if (!isOnline(ctx)) {
            // Immediately fall back to on-device inference
            runTFLite(ctx, uri, title, latitude, longitude);
            return;
        }

        // Online: try the server first
        File imageFile;
        try {
            imageFile = resolveUriToFile(ctx, uri);
        } catch (IOException e) {
            _identifyState.setValue(new IdentifyState.Error("Failed to read image file."));
            return;
        }

        RequestBody reqBody   = RequestBody.create(MediaType.parse("image/*"), imageFile);
        MultipartBody.Part imagePart = MultipartBody.Part
                .createFormData("image", imageFile.getName(), reqBody);
        RequestBody modelTypePart = RequestBody.create(
                MediaType.parse("text/plain"), "improved_original");
        RequestBody titlePart = RequestBody.create(
                MediaType.parse("text/plain"), title != null ? title : "");
        RequestBody latitudePart = textPart(latitude != null ? String.valueOf(latitude) : "");
        RequestBody longitudePart = textPart(longitude != null ? String.valueOf(longitude) : "");

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .identify(imagePart, modelTypePart, titlePart, latitudePart, longitudePart)
                .enqueue(new Callback<IdentifyResponse>() {
                    @Override
                    public void onResponse(Call<IdentifyResponse> call,
                                           Response<IdentifyResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getData() != null) {

                            IdentificationResult result = response.body().getData();
                            // ONLINE success — saved on server, id is valid
                            _identifyState.setValue(new IdentifyState.Success(result, false));
                            fetchCatalogEntry(ctx, result.getTopResult());
                            loadHistory(ctx);

                        } else {
                            // Server returned an error response — fall back to TFLite
                            Log.w(TAG, "Server error (code=" + response.code()
                                    + ") — falling back to TFLite.");
                            runTFLite(ctx, uri, title, latitude, longitude);
                        }
                    }

                    @Override
                    public void onFailure(Call<IdentifyResponse> call, Throwable t) {
                        // Network failure — fall back to TFLite
                        Log.w(TAG, "Network failure: " + t.getMessage()
                                + " — falling back to TFLite.");
                        runTFLite(ctx, uri, title, latitude, longitude);
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  TFLite on-device inference                                         //
    // ------------------------------------------------------------------ //

    /**
     * Runs CREYNet on-device via TFLite on a background thread.
     * Saves the result locally (PENDING queue) and posts the result to LiveData.
     */
    private void runTFLite(Context ctx, Uri uri, String title,
                           Double latitude, Double longitude) {
        bgExecutor.execute(() -> {
            try (TFLiteIdentifier tflite = new TFLiteIdentifier(ctx.getApplicationContext())) {

                IdentificationResult result = tflite.predict(ctx, uri);

                // Save to local offline queue
                saveOfflineResult(ctx, uri, title, result, "cnn", latitude, longitude);

                // Post to LiveData on main thread
                _identifyState.postValue(new IdentifyState.Success(result, true));

                // Catalog lookup still works offline (uses server, but ok to try)
                fetchCatalogEntry(ctx, result.getTopResult());

            } catch (IOException e) {
                Log.e(TAG, "TFLite inference failed: " + e.getMessage(), e);
                _identifyState.postValue(
                        new IdentifyState.Error("On-device inference failed: " + e.getMessage()));
            }
        });
    }

    /**
     * Persist an offline inference result to the local Room database.
     */
    private void saveOfflineResult(Context ctx, Uri uri, String title,
                                   IdentificationResult result, String method,
                                   Double latitude, Double longitude) {
        OfflineIdentification record = new OfflineIdentification();
        record.topResult     = result.getTopResult() != null ? result.getTopResult() : "";
        record.topConfidence = result.getTopConfidence() != null
                ? result.getTopConfidence() : 0d;
        record.identificationMethod = method;
        record.title         = (title != null && !title.isEmpty()) ? title : null;
        record.imagePath     = uri.toString();
        record.createdAt     = new SimpleDateFormat(
                "yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(new Date());
        record.latitude      = latitude;
        record.longitude     = longitude;
        record.status        = OfflineIdentification.STATUS_PENDING;

        AppDatabase.getInstance(ctx.getApplicationContext())
                .insert(record);

        // Update the pending badge immediately after saving
        refreshPendingCount(ctx);
    }

    public void identifyManually(Context ctx, int photoIndex, String title,
                                 String scientificName, Double latitude, Double longitude) {
        List<PhotoItem> photoList = getPhotoList();
        if (photoIndex < 0 || photoIndex >= photoList.size()) {
            _identifyState.setValue(new IdentifyState.Error("Select a photo before using the manual key."));
            return;
        }

        Uri uri = photoList.get(photoIndex).getImageUri();
        String safeTitle = title != null ? title : "";
        _identifyState.setValue(new IdentifyState.Loading());
        _catalogState.setValue(new CatalogState.Idle());

        if (!isOnline(ctx)) {
            queueManualResult(ctx, uri, safeTitle, scientificName, latitude, longitude);
            return;
        }

        File imageFile;
        try {
            imageFile = resolveUriToFile(ctx, uri);
        } catch (IOException e) {
            _identifyState.setValue(new IdentifyState.Error(
                    "Failed to read the selected image.",
                    () -> identifyManually(
                            ctx, photoIndex, safeTitle, scientificName, latitude, longitude)));
            return;
        }

        MultipartBody.Part imagePart = MultipartBody.Part.createFormData(
                "image", imageFile.getName(),
                RequestBody.create(MediaType.parse("image/*"), imageFile));

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .manualIdentify(
                        imagePart,
                        textPart(scientificName),
                        textPart(safeTitle),
                        textPart(imageFile.getName()),
                        null,
                        null,
                        textPart(latitude != null ? String.valueOf(latitude) : ""),
                        textPart(longitude != null ? String.valueOf(longitude) : ""))
                .enqueue(new Callback<IdentifyResponse>() {
                    @Override
                    public void onResponse(Call<IdentifyResponse> call,
                                           Response<IdentifyResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getData() != null) {
                            IdentificationResult result = response.body().getData();
                            _identifyState.setValue(new IdentifyState.Success(result, false));
                            fetchCatalogEntry(ctx, result.getTopResult());
                            loadHistory(ctx);
                        } else if (response.code() >= 500 || response.code() == 408) {
                            queueManualResult(ctx, uri, safeTitle, scientificName,
                                    latitude, longitude);
                        } else {
                            _identifyState.setValue(new IdentifyState.Error(
                                    "Could not save manual identification (HTTP "
                                            + response.code() + ").",
                                    () -> identifyManually(
                                            ctx, photoIndex, safeTitle, scientificName,
                                            latitude, longitude)));
                        }
                    }

                    @Override
                    public void onFailure(Call<IdentifyResponse> call, Throwable t) {
                        Log.w(TAG, "Manual identification save failed; queuing locally.", t);
                        queueManualResult(ctx, uri, safeTitle, scientificName,
                                latitude, longitude);
                    }
                });
    }

    private void queueManualResult(Context ctx, Uri uri, String title, String scientificName,
                                    Double latitude, Double longitude) {
        bgExecutor.execute(() -> {
            IdentificationResult result = new IdentificationResult(
                    -1, scientificName, null, "manual_key");
            saveOfflineResult(ctx, uri, title, result, "manual_key", latitude, longitude);
            _identifyState.postValue(new IdentifyState.Success(result, true));
            fetchCatalogEntry(ctx, scientificName);
        });
    }

    public void manuallyCorrectIdentification(Context ctx, int sourceIdentificationId,
                                              String scientificName, String notes,
                                              ManualSaveCallback callback) {
        if (!isOnline(ctx)) {
            callback.onComplete(false,
                    "Connect to the internet to save this correction to your account.");
            return;
        }

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .manualIdentify(
                        null,
                        textPart(scientificName),
                        textPart(""),
                        textPart(""),
                        textPart(String.valueOf(sourceIdentificationId)),
                        textPart(notes != null ? notes : ""),
                        textPart(""),
                        textPart(""))
                .enqueue(new Callback<IdentifyResponse>() {
                    @Override
                    public void onResponse(Call<IdentifyResponse> call,
                                           Response<IdentifyResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getData() != null) {
                            IdentificationResult result = response.body().getData();
                            _identifyState.setValue(new IdentifyState.Success(result, false));
                            fetchCatalogEntry(ctx, result.getTopResult());
                            loadHistory(ctx);
                            callback.onComplete(true, "Manual correction saved.");
                        } else {
                            callback.onComplete(false,
                                    "Could not save manual correction (HTTP "
                                            + response.code() + ").");
                        }
                    }

                    @Override
                    public void onFailure(Call<IdentifyResponse> call, Throwable t) {
                        Log.w(TAG, "Manual correction request failed.", t);
                        callback.onComplete(false,
                                "Network error — manual correction was not saved.");
                    }
                });
    }

    private RequestBody textPart(String value) {
        return RequestBody.create(MediaType.parse("text/plain"), value != null ? value : "");
    }

    // ------------------------------------------------------------------ //
    //  Sync pending offline records                                       //
    // ------------------------------------------------------------------ //

    /**
     * Call this when the app detects connectivity has been restored.
     * Uploads all PENDING local records to the server in the background,
     * then refreshes history and the pending count.
     */
    public void syncOfflineQueue(Context ctx) {
        OfflineSyncManager.syncPending(ctx.getApplicationContext(), () -> {
            refreshPendingCount(ctx);
            loadHistory(ctx);
        });
    }

    /**
     * Reads the PENDING count from the local DB and posts it to LiveData.
     * Safe to call from any thread.
     */
    public void refreshPendingCount(Context ctx) {
        bgExecutor.execute(() -> {
            int count = AppDatabase.getInstance(ctx.getApplicationContext())
                    .getPending().size();
            _pendingCount.postValue(count);
        });
    }

    // ------------------------------------------------------------------ //
    //  Catalog lookup                                                     //
    // ------------------------------------------------------------------ //

    private void fetchCatalogEntry(Context ctx, String scientificName) {
        if (scientificName == null || scientificName.isEmpty()) {
            _catalogState.postValue(new CatalogState.NotFound());
            return;
        }

        _catalogState.postValue(new CatalogState.Loading());

        String slug = scientificName.trim().toLowerCase().replaceAll("\\s+", "-");

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .getCatalogEntry("show", slug)
                .enqueue(new Callback<CatalogResponse>() {
                    @Override
                    public void onResponse(Call<CatalogResponse> call,
                                           Response<CatalogResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getData() != null) {
                            _catalogState.postValue(
                                    new CatalogState.Success(response.body().getData()));
                        } else {
                            _catalogState.postValue(new CatalogState.NotFound());
                        }
                    }

                    @Override
                    public void onFailure(Call<CatalogResponse> call, Throwable t) {
                        _catalogState.postValue(new CatalogState.Error());
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  History item → result card                                        //
    // ------------------------------------------------------------------ //

    public void showHistoryItemResult(Context ctx, Identification item) {
        IdentificationResult result = new IdentificationResult(
                item.getId(),
                item.getTopResult(),
                item.getTopConfidence(),
                item.getIdentificationMethod()
        );
        // History items are always server-saved, so isOffline = false
        _identifyState.setValue(new IdentifyState.Success(result, false));
        fetchCatalogEntry(ctx, item.getTopResult());
    }

    // ------------------------------------------------------------------ //
    //  History                                                            //
    // ------------------------------------------------------------------ //

    public void loadHistory(Context ctx) {
        // postValue — safe to call from any thread (sync callback or main thread)
        _historyState.postValue(new HistoryState.Loading());

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .getHistory(50, 0)
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
                            _historyState.postValue(new HistoryState.Success(
                                    records != null ? records : new ArrayList<>()));
                        } else {
                            _historyState.postValue(
                                    new HistoryState.Error("Failed to load history."));
                        }
                    }

                    @Override
                    public void onFailure(Call<HistoryResponse> call, Throwable t) {
                        _historyState.postValue(new HistoryState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    public void deleteHistoryItem(Context ctx, int id) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .deleteIdentification(id)
                .enqueue(new Callback<GenericResponse>() {
                    @Override public void onResponse(Call<GenericResponse> call, Response<GenericResponse> r) { loadHistory(ctx); }
                    @Override public void onFailure(Call<GenericResponse> call, Throwable t)                  { loadHistory(ctx); }
                });
    }

    public void deleteAllHistory(Context ctx) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .deleteAllIdentifications()
                .enqueue(new Callback<GenericResponse>() {
                    @Override public void onResponse(Call<GenericResponse> call, Response<GenericResponse> r) { loadHistory(ctx); }
                    @Override public void onFailure(Call<GenericResponse> call, Throwable t)                  { loadHistory(ctx); }
                });
    }

    public void updateTitle(Context ctx, int id, String title) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .updateTitle(new UpdateTitleRequest(id, title))
                .enqueue(new Callback<GenericResponse>() {
                    @Override public void onResponse(Call<GenericResponse> call, Response<GenericResponse> r) { loadHistory(ctx); }
                    @Override public void onFailure(Call<GenericResponse> call, Throwable t) { }
                });
    }

    // ------------------------------------------------------------------ //
    //  Connectivity check                                                 //
    // ------------------------------------------------------------------ //

    /** Returns true if the device has an active network connection. */
    public static boolean isOnline(Context ctx) {
        ConnectivityManager cm =
                (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.net.Network net = cm.getActiveNetwork();
            if (net == null) return false;
            NetworkCapabilities caps = cm.getNetworkCapabilities(net);
            return caps != null && (
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
        } else {
            android.net.NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        }
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    private File resolveUriToFile(Context ctx, Uri uri) throws IOException {
        if ("file".equals(uri.getScheme())) {
            return new File(uri.getPath());
        }
        File temp = File.createTempFile("identify_upload", ".jpg", ctx.getCacheDir());
        try (InputStream in  = ctx.getContentResolver().openInputStream(uri);
             FileOutputStream out = new FileOutputStream(temp)) {
            if (in == null) throw new IOException("Cannot open URI: " + uri);
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        }
        return temp;
    }

    @Override
    protected void onCleared() {
        super.onCleared();
        bgExecutor.shutdown();
    }
}
