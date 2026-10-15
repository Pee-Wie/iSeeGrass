package com.iseegrass.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.EditorInfo;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.iseegrass.app.databinding.ActivityLoginBinding;
import com.iseegrass.app.viewmodel.LoginViewModel;
import com.iseegrass.app.viewmodel.LoginViewModel.LoginState;

/**
 * Login screen.
 * Delegates network work to {@link LoginViewModel} and observes its
 * {@link LoginState} LiveData to drive the UI.
 */
public class LoginActivity extends AppCompatActivity {

    private ActivityLoginBinding binding;
    private LoginViewModel viewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        viewModel = new ViewModelProvider(this).get(LoginViewModel.class);

        setupListeners();
        observeViewModel();
    }

    // ------------------------------------------------------------------ //
    //  Setup                                                              //
    // ------------------------------------------------------------------ //

    private void setupListeners() {
        binding.btnLogin.setOnClickListener(v -> attemptLogin());

        // Allow "done" keyboard action to submit
        binding.etPassword.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                attemptLogin();
                return true;
            }
            return false;
        });
    }

    private void observeViewModel() {
        viewModel.getLoginState().observe(this, state -> {
            if (state instanceof LoginState.Loading) {
                showLoading(true);
                hideError();

            } else if (state instanceof LoginState.Success) {
                showLoading(false);
                startActivity(new Intent(this, MainActivity.class));
                finish();

            } else if (state instanceof LoginState.Error) {
                showLoading(false);
                showError(((LoginState.Error) state).message);
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Actions                                                            //
    // ------------------------------------------------------------------ //

    private void attemptLogin() {
        String username = getText(binding.etUsername);
        String password = getText(binding.etPassword);

        // Client-side validation
        boolean valid = true;
        if (username.isEmpty()) {
            binding.tilUsername.setError("Username is required");
            valid = false;
        } else {
            binding.tilUsername.setError(null);
        }
        if (password.isEmpty()) {
            binding.tilPassword.setError("Password is required");
            valid = false;
        } else {
            binding.tilPassword.setError(null);
        }

        if (!valid) return;

        viewModel.login(username, password, this);
    }

    // ------------------------------------------------------------------ //
    //  UI helpers                                                         //
    // ------------------------------------------------------------------ //

    private String getText(android.widget.EditText et) {
        return et.getText() != null ? et.getText().toString().trim() : "";
    }

    private void showLoading(boolean show) {
        binding.progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        binding.btnLogin.setEnabled(!show);
        binding.etUsername.setEnabled(!show);
        binding.etPassword.setEnabled(!show);
    }

    private void showError(String message) {
        binding.tvError.setText(message);
        binding.tvError.setVisibility(View.VISIBLE);
    }

    private void hideError() {
        binding.tvError.setVisibility(View.GONE);
    }
}
