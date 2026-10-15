package com.iseegrass.app.viewmodel;

import android.content.Context;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.iseegrass.app.model.AssessmentsListResponse;
import com.iseegrass.app.model.HistoryResponse;
import com.iseegrass.app.network.ApiClient;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * ViewModel for HomeFragment.
 *
 * <p>Fires two independent API calls to fetch total counts that are shown on
 * the quick-action cards:
 * <ul>
 *   <li>{@link #identificationCount} — total records from /api/identifications/user-history</li>
 *   <li>{@link #assessmentCount}     — total records from /api/assessments</li>
 * </ul>
 * Both calls are launched concurrently via separate {@code enqueue} invocations.
 * {@link #error} carries the message from whichever call fails last (non-critical).</p>
 */
public class HomeViewModel extends ViewModel {

    // ------------------------------------------------------------------ //
    //  LiveData                                                           //
    // ------------------------------------------------------------------ //

    private final MutableLiveData<Integer> _identificationCount = new MutableLiveData<>();
    /** Total number of identification records for the logged-in user. */
    public final LiveData<Integer> identificationCount = _identificationCount;

    private final MutableLiveData<Integer> _assessmentCount = new MutableLiveData<>();
    /** Total number of assessment records for the logged-in user. */
    public final LiveData<Integer> assessmentCount = _assessmentCount;

    private final MutableLiveData<String> _error = new MutableLiveData<>();
    /** Non-fatal error string if either count call fails. */
    public final LiveData<String> error = _error;

    // ------------------------------------------------------------------ //
    //  Load                                                               //
    // ------------------------------------------------------------------ //

    /**
     * Fires two concurrent API requests to retrieve the latest counts.
     * Each call posts to its own LiveData independently so a failure in one
     * does not block the other.
     *
     * @param ctx Any context — the application context is extracted internally.
     */
    public void loadStats(Context ctx) {
        loadIdentificationCount(ctx);
        loadAssessmentCount(ctx);
    }

    // ------------------------------------------------------------------ //
    //  Private helpers                                                    //
    // ------------------------------------------------------------------ //

    private void loadIdentificationCount(Context ctx) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .getHistory(1, 0)
                .enqueue(new Callback<HistoryResponse>() {
                    @Override
                    public void onResponse(Call<HistoryResponse> call,
                                           Response<HistoryResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().getData() != null) {
                            _identificationCount.postValue(
                                    response.body().getData().getTotal());
                        } else {
                            _error.postValue("Failed to load identification count.");
                        }
                    }

                    @Override
                    public void onFailure(Call<HistoryResponse> call, Throwable t) {
                        _error.postValue(t.getMessage() != null
                                ? t.getMessage() : "Network error.");
                    }
                });
    }

    private void loadAssessmentCount(Context ctx) {
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .getAssessments(1, 1)
                .enqueue(new Callback<AssessmentsListResponse>() {
                    @Override
                    public void onResponse(Call<AssessmentsListResponse> call,
                                           Response<AssessmentsListResponse> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            _assessmentCount.postValue(response.body().getTotal());
                        } else {
                            _error.postValue("Failed to load assessment count.");
                        }
                    }

                    @Override
                    public void onFailure(Call<AssessmentsListResponse> call, Throwable t) {
                        _error.postValue(t.getMessage() != null
                                ? t.getMessage() : "Network error.");
                    }
                });
    }
}
