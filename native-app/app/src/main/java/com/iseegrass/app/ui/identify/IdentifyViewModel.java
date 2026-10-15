package com.iseegrass.app.ui.identify;

import android.content.Context;
import android.net.Uri;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.model.HistoryResponse;
import com.iseegrass.app.model.Identification;
import com.iseegrass.app.model.IdentificationResult;
import com.iseegrass.app.model.IdentifyResponse;
import com.iseegrass.app.model.UpdateTitleRequest;
import com.iseegrass.app.network.ApiClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * ViewModel for the Identification module.
 *
 * <p>Holds the photo-collector list and drives two independent LiveData streams:
 * <ul>
 *   <li>{@link #identifyState} — progress / result / error for a single identify call</li>
 *   <li>{@link #historyState} — loading / list / error for the ID history list</li>
 * </ul>
 * All network calls are made here; the Fragment only observes LiveData.</p>
 */
public class IdentifyViewModel extends ViewModel {

    // ------------------------------------------------------------------ //
    //  State sealed classes (approximated with static inner classes)      //
    // ------------------------------------------------------------------ //

    public static abstract class IdentifyState {
        public static final class Idle extends IdentifyState { }

        public static final class Loading extends IdentifyState { }

        public static final class Success extends IdentifyState {
            public final IdentificationResult result;
            public Success(IdentificationResult result) { this.result = result; }
        }

        public static final class Error extends IdentifyState {
            public final String message;
            public Error(String message) { this.message = message; }
        }
    }

    public static abstract class HistoryState {
        public static final class Loading extends HistoryState { }

        public static final class Success extends HistoryState {
            public final List<Identification> items;
            public Success(List<Identification> items) { this.items = items; }
        }

        public static final class Error extends HistoryState {
            public final String message;
            public Error(String message) { this.message = message; }
        }
    }

    // ------------------------------------------------------------------ //
    //  LiveData                                                           //
    // ------------------------------------------------------------------ //

    private final MutableLiveData<List<PhotoItem>> _photos = new MutableLiveData<>(new ArrayList<>());
    public LiveData<List<PhotoItem>> photos = _photos;

    private final MutableLiveData<IdentifyState> _identifyState =
            new MutableLiveData<>(new IdentifyState.Idle());
    public LiveData<IdentifyState> identifyState = _identifyState;

    private final MutableLiveData<HistoryState> _historyState = new MutableLiveData<>();
    public LiveData<HistoryState> historyState = _historyState;

    // ------------------------------------------------------------------ //
    //  Photo-collector mutations                                          //
    // ------------------------------------------------------------------ //

    /** Add a new photo to the collector. */
    public void addPhoto(Uri uri, String title) {
        List<PhotoItem> current = getPhotoList();
        current.add(new PhotoItem(uri, title));
        _photos.setValue(current);
    }

    /** Remove the photo at the given index. */
    public void removePhoto(int index) {
        List<PhotoItem> current = getPhotoList();
        if (index >= 0 && index < current.size()) {
            current.remove(index);
            _photos.setValue(current);
        }
    }

    /** Remove all photos from the collector. */
    public void clearPhotos() {
        _photos.setValue(new ArrayList<>());
    }

    private List<PhotoItem> getPhotoList() {
        List<PhotoItem> current = _photos.getValue();
        return current != null ? current : new ArrayList<>();
    }

    // ------------------------------------------------------------------ //
    //  Identify                                                           //
    // ------------------------------------------------------------------ //

    /**
     * Submit the photo at {@code photoIndex} to the /api/identify endpoint.
     *
     * @param ctx        Application or Fragment context (used for ApiClient + cache dir)
     * @param photoIndex Index in the photos LiveData list
     * @param title      Optional title override (may be empty)
     */
    public void identify(Context ctx, int photoIndex, String title) {
        List<PhotoItem> photoList = getPhotoList();
        if (photoIndex < 0 || photoIndex >= photoList.size()) {
            _identifyState.setValue(
                    new IdentifyState.Error("No photo at index " + photoIndex));
            return;
        }

        _identifyState.setValue(new IdentifyState.Loading());

        Uri uri = photoList.get(photoIndex).getImageUri();

        // Resolve Uri → File (copy content:// to a temp file if needed)
        File imageFile;
        try {
            imageFile = resolveUriToFile(ctx, uri);
        } catch (IOException e) {
            _identifyState.setValue(
                    new IdentifyState.Error("Failed to read image file."));
            return;
        }

        RequestBody reqBody = RequestBody.create(
                MediaType.parse("image/*"), imageFile);
        MultipartBody.Part imagePart = MultipartBody.Part
                .createFormData("image", imageFile.getName(), reqBody);
        RequestBody modelType = RequestBody.create(
                MediaType.parse("text/plain"), "improved_original");

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .identify(imagePart, modelType)
                .enqueue(new Callback<IdentifyResponse>() {
                    @Override
                    public void onResponse(Call<IdentifyResponse> call,
                                           Response<IdentifyResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getData() != null) {
                            _identifyState.setValue(
                                    new IdentifyState.Success(response.body().getData()));
                            // Refresh history to include the new record
                            loadHistory(ctx);
                        } else {
                            _identifyState.setValue(
                                    new IdentifyState.Error("Identification failed."));
                        }
                    }

                    @Override
                    public void onFailure(Call<IdentifyResponse> call, Throwable t) {
                        _identifyState.setValue(
                                new IdentifyState.Error(
                                        t.getMessage() != null
                                                ? t.getMessage()
                                                : "Network error."));
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  History                                                            //
    // ------------------------------------------------------------------ //

    /** Fetch the latest identification history from the server. */
    public void loadHistory(Context ctx) {
        _historyState.setValue(new HistoryState.Loading());

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
                            _historyState.setValue(new HistoryState.Success(
                                    records != null ? records : new ArrayList<>()));
                        } else {
                            _historyState.setValue(
                                    new HistoryState.Error("Failed to load history."));
                        }
                    }

                    @Override
                    public void onFailure(Call<HistoryResponse> call, Throwable t) {
                        _historyState.setValue(
                                new HistoryState.Error(
                                        t.getMessage() != null
                                                ? t.getMessage()
                                                : "Network error."));
                    }
                });
    }

    /** Hard-delete a single identification record, then refresh history. */
    public void deleteHistoryItem(Context ctx, int id) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .deleteIdentification(id)
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        // Refresh regardless of server response so UI stays in sync
                        loadHistory(ctx);
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        // Best-effort: still try to reload so UI shows current state
                        loadHistory(ctx);
                    }
                });
    }

    /** Hard-delete all identification records for the current user, then refresh. */
    public void deleteAllHistory(Context ctx) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .deleteAllIdentifications()
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        loadHistory(ctx);
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        loadHistory(ctx);
                    }
                });
    }

    /**
     * Update the title of a history record.
     * Refreshes history on success so the list reflects the new title.
     */
    public void updateTitle(Context ctx, int id, String title) {
        UpdateTitleRequest req = new UpdateTitleRequest(id, title);
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .updateTitle(req)
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        loadHistory(ctx);
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        // Title update failed silently; history unchanged
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    /**
     * Resolves a content:// or file:// URI to a concrete File the HTTP client
     * can read as a multipart body.  For content:// URIs a temp copy is made in
     * the app's private cache directory.
     */
    private File resolveUriToFile(Context ctx, Uri uri) throws IOException {
        if ("file".equals(uri.getScheme())) {
            return new File(uri.getPath());
        }

        // content:// → copy to temp file
        File temp = File.createTempFile("identify_upload", ".jpg",
                ctx.getCacheDir());
        try (InputStream in = ctx.getContentResolver().openInputStream(uri);
             FileOutputStream out = new FileOutputStream(temp)) {
            if (in == null) throw new IOException("Cannot open URI: " + uri);
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        }
        return temp;
    }
}
