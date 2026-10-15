package com.iseegrass.app.network;

import android.content.Context;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/**
 * Singleton that wires together OkHttp + Retrofit + our PersistentCookieJar.
 *
 * Usage:
 *   ApiService api = ApiClient.getInstance(context).getApiService();
 */
public class ApiClient {

    private static ApiClient instance;

    private final PersistentCookieJar cookieJar;
    private final ApiService apiService;

    private ApiClient(Context context) {
        cookieJar = new PersistentCookieJar(context);

        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(HttpLoggingInterceptor.Level.BODY);

        OkHttpClient okHttpClient = new OkHttpClient.Builder()
                .cookieJar(cookieJar)
                .addInterceptor(logging)
                .connectTimeout(Constants.CONNECT_TIMEOUT, TimeUnit.SECONDS)
                .readTimeout(Constants.READ_TIMEOUT,    TimeUnit.SECONDS)
                .writeTimeout(Constants.WRITE_TIMEOUT,  TimeUnit.SECONDS)
                .build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(Constants.BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);
    }

    /** Returns (and lazily creates) the singleton, using the application context. */
    public static synchronized ApiClient getInstance(Context context) {
        if (instance == null) {
            instance = new ApiClient(context.getApplicationContext());
        }
        return instance;
    }

    public ApiService getApiService() {
        return apiService;
    }

    public PersistentCookieJar getCookieJar() {
        return cookieJar;
    }
}
