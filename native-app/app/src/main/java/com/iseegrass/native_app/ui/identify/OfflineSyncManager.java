package com.iseegrass.native_app.ui.identify;

import android.content.Context;
import android.net.Uri;
import android.util.Log;

import com.iseegrass.native_app.model.AppDatabase;
import com.iseegrass.native_app.model.IdentifyResponse;
import com.iseegrass.native_app.model.OfflineIdentification;
import com.iseegrass.native_app.network.ApiClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Response;

/**
 * Uploads pending offline identification records to the server.
 *
 * Call {@link #syncPending(Context, Runnable)} whenever the app determines
 * it has regained connectivity. The callback is posted on the calling thread
 * after all pending records have been attempted (success or failure).
 *
 * Each pending record is uploaded using the same {@code /api/identify}
 * endpoint. On success the local record is marked SYNCED and its
 * server-assigned id is stored for reference.
 */
public class OfflineSyncManager {

    private static final String TAG = "OfflineSyncManager";

    private static final ExecutorService executor =
            Executors.newSingleThreadExecutor();

    private OfflineSyncManager() { /* static utility */ }

    /**
     * Attempt to upload all PENDING offline records.
     *
     * @param context  Application context.
     * @param onDone   Optional callback invoked on the executor thread after
     *                 all pending records have been attempted. May be null.
     */
    public static void syncPending(Context context, Runnable onDone) {
        executor.execute(() -> {
            AppDatabase db  = AppDatabase.getInstance(context);
            List<OfflineIdentification> pending = db.getPending();

            if (pending.isEmpty()) {
                if (onDone != null) onDone.run();
                return;
            }

            Log.d(TAG, "Syncing " + pending.size() + " pending offline record(s)…");

            for (OfflineIdentification record : pending) {
                try {
                    uploadRecord(context, record, db);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to sync record id=" + record.id + ": " + e.getMessage());
                    // Leave it PENDING — will be retried next time.
                }
            }

            if (onDone != null) onDone.run();
        });
    }

    // ------------------------------------------------------------------ //
    //  Upload one record                                                  //
    // ------------------------------------------------------------------ //

    private static void uploadRecord(Context context,
                                     OfflineIdentification record,
                                     AppDatabase db) throws IOException {
        File imageFile = resolveImageFile(context, record.imagePath);
        if (imageFile == null || !imageFile.exists()) {
            Log.w(TAG, "Image missing for offline record id=" + record.id
                    + ", path=" + record.imagePath + " — skipping.");
            return;
        }

        RequestBody reqBody  = RequestBody.create(MediaType.parse("image/*"), imageFile);
        MultipartBody.Part imagePart = MultipartBody.Part
                .createFormData("image", imageFile.getName(), reqBody);
        RequestBody titlePart = RequestBody.create(
                MediaType.parse("text/plain"),
                record.title != null ? record.title : "");

        retrofit2.Call<IdentifyResponse> request;
        if ("manual_key".equals(record.identificationMethod)) {
            request = ApiClient.getInstance(context)
                    .getApiService()
                    .manualIdentify(
                            imagePart,
                            RequestBody.create(MediaType.parse("text/plain"), record.topResult),
                            titlePart,
                            RequestBody.create(MediaType.parse("text/plain"), imageFile.getName()),
                            null,
                            null,
                            textPart(record.latitude),
                            textPart(record.longitude));
        } else {
            RequestBody modelTypePart = RequestBody.create(
                    MediaType.parse("text/plain"), "improved_original");
            request = ApiClient.getInstance(context)
                    .getApiService()
                    .identify(imagePart, modelTypePart, titlePart,
                            textPart(record.latitude), textPart(record.longitude));
        }

        Response<IdentifyResponse> response = request.execute();

        if (response.isSuccessful()
                && response.body() != null
                && response.body().isSuccess()
                && response.body().getData() != null) {

            int serverId = response.body().getData().getIdentificationId();
            db.markSynced(record.id, serverId);
            Log.d(TAG, "Record id=" + record.id + " synced → server id=" + serverId);
        } else {
            Log.w(TAG, "Server rejected upload for record id=" + record.id
                    + ": code=" + response.code());
        }
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    /**
     * Resolve an image path (content URI string or file path) to a File
     * the Retrofit multipart builder can read.
     */
    private static File resolveImageFile(Context context, String imagePath) throws IOException {
        if (imagePath == null) return null;

        if (imagePath.startsWith("content://") || imagePath.startsWith("file://")) {
            Uri uri = Uri.parse(imagePath);
            // Copy to a temp file so Retrofit can determine the content length
            File temp = File.createTempFile("sync_upload", ".jpg", context.getCacheDir());
            try (InputStream in  = context.getContentResolver().openInputStream(uri);
                 FileOutputStream out = new FileOutputStream(temp)) {
                if (in == null) return null;
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            }
            return temp;
        }

        return new File(imagePath);
    }

    private static RequestBody textPart(Double value) {
        return RequestBody.create(
                MediaType.parse("text/plain"),
                value != null ? String.valueOf(value) : "");
    }
}
