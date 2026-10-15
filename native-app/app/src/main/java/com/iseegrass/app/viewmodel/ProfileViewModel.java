package com.iseegrass.app.viewmodel;

import android.content.Context;
import android.net.Uri;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.iseegrass.app.model.AvatarResponse;
import com.iseegrass.app.model.ChangePasswordRequest;
import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.model.MeResponse;
import com.iseegrass.app.model.User;
import com.iseegrass.app.model.UserResponse;
import com.iseegrass.app.network.ApiClient;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * ViewModel for ProfileFragment.
 *
 * <p>Exposes two LiveData streams:
 * <ul>
 *   <li>{@link #profileState} — Loading / Success(User) / Error(String) for the profile fetch</li>
 *   <li>{@link #actionState}  — Idle / Loading / Success(String) / Error(String) for
 *       password change, avatar upload, and logout</li>
 * </ul>
 */
public class ProfileViewModel extends ViewModel {

    // ------------------------------------------------------------------ //
    //  State types                                                        //
    // ------------------------------------------------------------------ //

    public static abstract class ProfileState {
        public static final class Loading extends ProfileState { }

        public static final class Success extends ProfileState {
            public final User user;
            public Success(User user) { this.user = user; }
        }

        public static final class Error extends ProfileState {
            public final String message;
            public Error(String message) { this.message = message; }
        }
    }

    public static abstract class ActionState {
        public static final class Idle extends ActionState { }

        public static final class Loading extends ActionState { }

        public static final class Success extends ActionState {
            public final String message;
            public Success(String message) { this.message = message; }
        }

        public static final class Error extends ActionState {
            public final String message;
            public Error(String message) { this.message = message; }
        }
    }

    // ------------------------------------------------------------------ //
    //  LiveData                                                           //
    // ------------------------------------------------------------------ //

    private final MutableLiveData<ProfileState> _profileState = new MutableLiveData<>();
    public final LiveData<ProfileState> profileState = _profileState;

    private final MutableLiveData<ActionState> _actionState =
            new MutableLiveData<>(new ActionState.Idle());
    public final LiveData<ActionState> actionState = _actionState;

    // ------------------------------------------------------------------ //
    //  Reset helpers                                                      //
    // ------------------------------------------------------------------ //

    /** Reset actionState to Idle so the fragment stops reacting to a stale event. */
    public void clearActionState() {
        _actionState.setValue(new ActionState.Idle());
    }

    // ------------------------------------------------------------------ //
    //  Load profile                                                       //
    // ------------------------------------------------------------------ //

    /**
     * Two-step profile load:
     * <ol>
     *   <li>GET /api/auth/me → obtain userId</li>
     *   <li>GET /api/users/show?id={userId} → fetch full profile</li>
     * </ol>
     *
     * @param ctx Any context — the application context is extracted internally.
     */
    public void loadProfile(Context ctx) {
        _profileState.setValue(new ProfileState.Loading());

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .getMe()
                .enqueue(new Callback<MeResponse>() {
                    @Override
                    public void onResponse(Call<MeResponse> call,
                                           Response<MeResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getUser() != null) {
                            int userId = response.body().getUser().getId();
                            fetchUserById(ctx, userId);
                        } else {
                            _profileState.postValue(
                                    new ProfileState.Error("Could not load session."));
                        }
                    }

                    @Override
                    public void onFailure(Call<MeResponse> call, Throwable t) {
                        _profileState.postValue(new ProfileState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    private void fetchUserById(Context ctx, int userId) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .getUser(userId)
                .enqueue(new Callback<UserResponse>() {
                    @Override
                    public void onResponse(Call<UserResponse> call,
                                           Response<UserResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()
                                && response.body().getUser() != null) {
                            _profileState.postValue(
                                    new ProfileState.Success(response.body().getUser()));
                        } else {
                            _profileState.postValue(
                                    new ProfileState.Error("Could not load profile."));
                        }
                    }

                    @Override
                    public void onFailure(Call<UserResponse> call, Throwable t) {
                        _profileState.postValue(new ProfileState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Change password                                                    //
    // ------------------------------------------------------------------ //

    /**
     * POST /api/users/change_password?id={userId}
     *
     * @param ctx       Any context.
     * @param userId    The user's numeric ID.
     * @param currentPw The user's current (existing) password.
     * @param newPw     The desired new password.
     */
    public void changePassword(Context ctx, int userId,
                                String currentPw, String newPw) {
        _actionState.setValue(new ActionState.Loading());

        ChangePasswordRequest req = new ChangePasswordRequest(currentPw, newPw);
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .changePassword(userId, req)
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            _actionState.postValue(
                                    new ActionState.Success("Password updated."));
                        } else {
                            String msg = "Failed to update password.";
                            if (response.body() != null
                                    && response.body().getMessage() != null) {
                                msg = response.body().getMessage();
                            }
                            _actionState.postValue(new ActionState.Error(msg));
                        }
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        _actionState.postValue(new ActionState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Upload avatar                                                      //
    // ------------------------------------------------------------------ //

    /**
     * POST /api/users/avatar (multipart).
     * Copies the URI to a temp file before uploading so the HTTP client
     * can determine Content-Length.
     *
     * @param ctx      Any context — used for ContentResolver and cache dir.
     * @param imageUri The gallery or camera URI of the chosen image.
     */
    public void uploadAvatar(Context ctx, Uri imageUri) {
        _actionState.setValue(new ActionState.Loading());

        File tempFile;
        try {
            tempFile = File.createTempFile("avatar_upload", ".jpg",
                    ctx.getCacheDir());
            try (InputStream in =
                         ctx.getContentResolver().openInputStream(imageUri);
                 FileOutputStream out = new FileOutputStream(tempFile)) {
                if (in == null) throw new IOException("Cannot open image URI.");
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            }
        } catch (IOException e) {
            _actionState.postValue(
                    new ActionState.Error("Failed to read selected image."));
            return;
        }

        RequestBody reqBody = RequestBody.create(
                MediaType.parse("image/*"), tempFile);
        MultipartBody.Part part = MultipartBody.Part
                .createFormData("avatar", tempFile.getName(), reqBody);

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .uploadAvatar(part)
                .enqueue(new Callback<AvatarResponse>() {
                    @Override
                    public void onResponse(Call<AvatarResponse> call,
                                           Response<AvatarResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            _actionState.postValue(
                                    new ActionState.Success("Avatar updated."));
                            // Re-fetch profile so avatar filename is current
                            loadProfile(ctx);
                        } else {
                            _actionState.postValue(
                                    new ActionState.Error("Failed to upload avatar."));
                        }
                    }

                    @Override
                    public void onFailure(Call<AvatarResponse> call, Throwable t) {
                        _actionState.postValue(new ActionState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Logout                                                             //
    // ------------------------------------------------------------------ //

    /**
     * POST /api/auth/logout, then clears the persistent cookie jar.
     * The fragment should observe {@link #actionState} for
     * {@link ActionState.Success} to finish the activity.
     *
     * @param ctx Any context.
     */
    public void logout(Context ctx) {
        _actionState.setValue(new ActionState.Loading());

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .logout()
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        // Clear cookies regardless of server-side success
                        ApiClient.getInstance(ctx.getApplicationContext())
                                .getCookieJar().clear();
                        _actionState.postValue(new ActionState.Success("Logged out."));
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        // Still log out locally even on network error
                        ApiClient.getInstance(ctx.getApplicationContext())
                                .getCookieJar().clear();
                        _actionState.postValue(new ActionState.Success("Logged out."));
                    }
                });
    }
}
