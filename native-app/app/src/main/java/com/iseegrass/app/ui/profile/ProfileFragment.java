package com.iseegrass.app.ui.profile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.iseegrass.app.LoginActivity;
import com.iseegrass.app.MainActivity;
import com.iseegrass.app.R;
import com.iseegrass.app.databinding.FragmentProfileBinding;
import com.iseegrass.app.model.AvatarResponse;
import com.iseegrass.app.model.ChangePasswordRequest;
import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.model.MeResponse;
import com.iseegrass.app.model.User;
import com.iseegrass.app.network.ApiClient;
import com.iseegrass.app.network.Constants;

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
 * User profile: shows user info, allows avatar upload, password change, logout.
 */
public class ProfileFragment extends Fragment {

    private FragmentProfileBinding binding;
    private User currentUser;

    private ActivityResultLauncher<String> avatarPickerLauncher;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        avatarPickerLauncher = registerForActivityResult(
                new ActivityResultContracts.GetContent(),
                uri -> {
                    if (uri != null) uploadAvatar(uri);
                });
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             ViewGroup container,
                             Bundle savedInstanceState) {
        binding = FragmentProfileBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view,
                               @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        setupClickListeners();
        loadProfile();
    }

    // ------------------------------------------------------------------ //
    //  Load                                                               //
    // ------------------------------------------------------------------ //

    private void loadProfile() {
        // Try MainActivity first (cached)
        if (getActivity() instanceof MainActivity) {
            User cached = ((MainActivity) getActivity()).getCurrentUser();
            if (cached != null) {
                populateUI(cached);
            }
        }

        // Always fetch fresh data
        ApiClient.getInstance(requireContext())
                .getApiService()
                .getMe()
                .enqueue(new Callback<MeResponse>() {
                    @Override
                    public void onResponse(Call<MeResponse> call,
                                           Response<MeResponse> response) {
                        if (binding == null) return;
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            currentUser = response.body().getUser();
                            populateUI(currentUser);
                        }
                    }

                    @Override
                    public void onFailure(Call<MeResponse> call, Throwable t) {
                        if (binding == null) return;
                        Toast.makeText(requireContext(),
                                getString(R.string.network_error),
                                Toast.LENGTH_SHORT).show();
                    }
                });
    }

    private void populateUI(User user) {
        this.currentUser = user;

        binding.tvFullName.setText(user.getFullName());
        binding.tvUsername.setText("@" + user.getUsername());
        binding.tvEmail.setText(user.getEmail() != null ? user.getEmail() : "");
        binding.tvPosition.setText(
                user.getPosition() != null ? user.getPosition() : "");
        binding.tvInstitution.setText(
                user.getInstitution() != null ? user.getInstitution() : "");

        // Avatar
        if (user.getAvatarFilename() != null && !user.getAvatarFilename().isEmpty()) {
            String avatarUrl = Constants.BASE_URL
                    + "uploads/avatars/" + user.getAvatarFilename();
            Glide.with(this)
                    .load(avatarUrl)
                    .centerCrop()
                    .placeholder(R.drawable.ic_avatar_placeholder)
                    .diskCacheStrategy(DiskCacheStrategy.NONE)
                    .skipMemoryCache(true)
                    .into(binding.ivAvatar);
        } else {
            binding.ivAvatar.setImageResource(R.drawable.ic_avatar_placeholder);
            // Remove tint when a real image is set — keep tint for placeholder
        }
    }

    // ------------------------------------------------------------------ //
    //  Click listeners                                                    //
    // ------------------------------------------------------------------ //

    private void setupClickListeners() {
        binding.ivAvatar.setOnClickListener(v -> showAvatarOptions());
        binding.btnUpdatePassword.setOnClickListener(v -> attemptChangePassword());
        binding.btnLogout.setOnClickListener(v -> confirmLogout());
    }

    // ------------------------------------------------------------------ //
    //  Avatar                                                             //
    // ------------------------------------------------------------------ //

    private void showAvatarOptions() {
        boolean hasAvatar = currentUser != null
                && currentUser.getAvatarFilename() != null
                && !currentUser.getAvatarFilename().isEmpty();

        String[] options = hasAvatar
                ? new String[]{"Change Avatar", "Remove Avatar"}
                : new String[]{"Upload Avatar"};

        new AlertDialog.Builder(requireContext())
                .setItems(options, (d, which) -> {
                    if (which == 0) avatarPickerLauncher.launch("image/*");
                    else if (which == 1 && hasAvatar) deleteAvatar();
                })
                .show();
    }

    private void uploadAvatar(android.net.Uri uri) {
        try {
            File tempFile = File.createTempFile("avatar", ".jpg",
                    requireContext().getCacheDir());
            try (InputStream in =
                         requireContext().getContentResolver().openInputStream(uri);
                 FileOutputStream out = new FileOutputStream(tempFile)) {
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            }

            RequestBody reqBody = RequestBody.create(
                    MediaType.parse("image/*"), tempFile);
            MultipartBody.Part part = MultipartBody.Part
                    .createFormData("avatar", tempFile.getName(), reqBody);

            ApiClient.getInstance(requireContext())
                    .getApiService()
                    .uploadAvatar(part)
                    .enqueue(new Callback<AvatarResponse>() {
                        @Override
                        public void onResponse(Call<AvatarResponse> call,
                                               Response<AvatarResponse> response) {
                            if (binding == null) return;
                            loadProfile(); // Refresh to show new avatar
                        }

                        @Override
                        public void onFailure(Call<AvatarResponse> call, Throwable t) {
                            if (binding == null) return;
                            Toast.makeText(requireContext(),
                                    getString(R.string.network_error),
                                    Toast.LENGTH_SHORT).show();
                        }
                    });

        } catch (IOException e) {
            Toast.makeText(requireContext(),
                    "Failed to read image", Toast.LENGTH_SHORT).show();
        }
    }

    private void deleteAvatar() {
        ApiClient.getInstance(requireContext())
                .getApiService()
                .deleteAvatar()
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        if (binding == null) return;
                        binding.ivAvatar.setImageResource(R.drawable.ic_avatar_placeholder);
                        if (currentUser != null) {
                            // Reset local avatar filename reference
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

    // ------------------------------------------------------------------ //
    //  Change password                                                    //
    // ------------------------------------------------------------------ //

    private void attemptChangePassword() {
        String current = getEditText(binding.etCurrentPassword);
        String newPass  = getEditText(binding.etNewPassword);

        boolean valid = true;
        if (current.isEmpty()) {
            binding.tilCurrentPassword.setError("Required");
            valid = false;
        } else {
            binding.tilCurrentPassword.setError(null);
        }
        if (newPass.isEmpty()) {
            binding.tilNewPassword.setError("Required");
            valid = false;
        } else {
            binding.tilNewPassword.setError(null);
        }
        if (!valid) return;

        if (currentUser == null) return;

        binding.tvPasswordError.setVisibility(View.GONE);
        binding.btnUpdatePassword.setEnabled(false);

        ChangePasswordRequest req = new ChangePasswordRequest(current, newPass);
        ApiClient.getInstance(requireContext())
                .getApiService()
                .changePassword(currentUser.getId(), req)
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        if (binding == null) return;
                        binding.btnUpdatePassword.setEnabled(true);

                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            binding.etCurrentPassword.setText("");
                            binding.etNewPassword.setText("");
                            Toast.makeText(requireContext(),
                                    "Password updated", Toast.LENGTH_SHORT).show();
                        } else {
                            String msg = "Failed to update password.";
                            if (response.body() != null
                                    && response.body().getMessage() != null) {
                                msg = response.body().getMessage();
                            }
                            binding.tvPasswordError.setText(msg);
                            binding.tvPasswordError.setVisibility(View.VISIBLE);
                        }
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        if (binding == null) return;
                        binding.btnUpdatePassword.setEnabled(true);
                        binding.tvPasswordError.setText(
                                getString(R.string.network_error));
                        binding.tvPasswordError.setVisibility(View.VISIBLE);
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Logout                                                             //
    // ------------------------------------------------------------------ //

    private void confirmLogout() {
        new AlertDialog.Builder(requireContext())
                .setMessage(R.string.logout)
                .setPositiveButton(R.string.logout, (d, w) -> performLogout())
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void performLogout() {
        ApiClient.getInstance(requireContext())
                .getApiService()
                .logout()
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        doLocalLogout();
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        // Logout locally even if server is unreachable
                        doLocalLogout();
                    }
                });
    }

    private void doLocalLogout() {
        ApiClient.getInstance(requireContext()).getCookieJar().clear();
        Intent intent = new Intent(requireContext(), LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    private String getEditText(android.widget.EditText et) {
        return et.getText() != null ? et.getText().toString().trim() : "";
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
