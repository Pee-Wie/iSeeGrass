package com.iseegrass.app.viewmodel;

import android.content.Context;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.iseegrass.app.model.LoginRequest;
import com.iseegrass.app.model.LoginResponse;
import com.iseegrass.app.model.User;
import com.iseegrass.app.network.ApiClient;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * ViewModel for LoginActivity.
 * Exposes a single {@link LiveData} of {@link LoginState} so the Activity
 * can observe auth progress without holding a direct reference to Retrofit.
 */
public class LoginViewModel extends ViewModel {

    // ------------------------------------------------------------------ //
    //  State sealed-class equivalent                                      //
    // ------------------------------------------------------------------ //

    public static abstract class LoginState {
        private LoginState() {}

        public static final class Loading extends LoginState {}

        public static final class Success extends LoginState {
            public final User user;
            public Success(User user) { this.user = user; }
        }

        public static final class Error extends LoginState {
            public final String message;
            public Error(String message) { this.message = message; }
        }
    }

    // ------------------------------------------------------------------ //
    //  LiveData                                                           //
    // ------------------------------------------------------------------ //

    private final MutableLiveData<LoginState> _loginState = new MutableLiveData<>();

    public LiveData<LoginState> getLoginState() {
        return _loginState;
    }

    // ------------------------------------------------------------------ //
    //  Actions                                                            //
    // ------------------------------------------------------------------ //

    /**
     * Initiates a login request.
     *
     * @param username plaintext username
     * @param password plaintext password
     * @param context  application/activity context needed to obtain ApiClient
     */
    public void login(String username, String password, Context context) {
        _loginState.setValue(new LoginState.Loading());

        LoginRequest body = new LoginRequest(username, password);

        ApiClient.getInstance(context)
                .getApiService()
                .login(body)
                .enqueue(new Callback<LoginResponse>() {
                    @Override
                    public void onResponse(Call<LoginResponse> call,
                                           Response<LoginResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            _loginState.postValue(
                                    new LoginState.Success(response.body().getData()));
                        } else {
                            String msg = "Login failed.";
                            if (response.body() != null
                                    && response.body().getMessage() != null) {
                                msg = response.body().getMessage();
                            }
                            _loginState.postValue(new LoginState.Error(msg));
                        }
                    }

                    @Override
                    public void onFailure(Call<LoginResponse> call, Throwable t) {
                        _loginState.postValue(
                                new LoginState.Error("Network error: " + t.getMessage()));
                    }
                });
    }
}
