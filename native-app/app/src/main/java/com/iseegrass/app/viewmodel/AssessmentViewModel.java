package com.iseegrass.app.viewmodel;

import android.content.Context;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.iseegrass.app.model.Assessment;
import com.iseegrass.app.model.AssessmentCreateRequest;
import com.iseegrass.app.model.AssessmentDetailResponse;
import com.iseegrass.app.model.AssessmentsListResponse;
import com.iseegrass.app.model.AssessmentUpdateRequest;
import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.network.ApiClient;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * ViewModel for the Assessment module.
 *
 * <p>Exposes two LiveData streams:
 * <ul>
 *   <li>{@link #listState} — Loading / Success / Error for the assessment list</li>
 *   <li>{@link #actionState} — Idle / Loading / Success / Error for create/update/delete</li>
 * </ul>
 * {@link #currentAssessment} holds the assessment being edited.</p>
 */
public class AssessmentViewModel extends ViewModel {

    // ------------------------------------------------------------------ //
    //  State types                                                        //
    // ------------------------------------------------------------------ //

    public static abstract class AssessmentListState {
        public static final class Loading extends AssessmentListState { }

        public static final class Success extends AssessmentListState {
            public final List<Assessment> items;
            public Success(List<Assessment> items) { this.items = items; }
        }

        public static final class Error extends AssessmentListState {
            public final String message;
            public Error(String message) { this.message = message; }
        }
    }

    public static abstract class AssessmentActionState {
        public static final class Idle extends AssessmentActionState { }

        public static final class Loading extends AssessmentActionState { }

        public static final class Success extends AssessmentActionState {
            public final String message;
            public Success(String message) { this.message = message; }
        }

        public static final class Error extends AssessmentActionState {
            public final String message;
            public Error(String message) { this.message = message; }
        }
    }

    // ------------------------------------------------------------------ //
    //  LiveData                                                           //
    // ------------------------------------------------------------------ //

    private final MutableLiveData<AssessmentListState> _listState = new MutableLiveData<>();
    public LiveData<AssessmentListState> listState = _listState;

    private final MutableLiveData<AssessmentActionState> _actionState =
            new MutableLiveData<>(new AssessmentActionState.Idle());
    public LiveData<AssessmentActionState> actionState = _actionState;

    /** The assessment currently open in the editor (may be null for new). */
    private Assessment currentAssessment;

    // ------------------------------------------------------------------ //
    //  Current assessment                                                 //
    // ------------------------------------------------------------------ //

    public Assessment getCurrentAssessment() { return currentAssessment; }

    public void setCurrentAssessment(Assessment a) { currentAssessment = a; }

    /** Reset actionState to Idle so the fragment can stop reacting to a stale event. */
    public void clearActionState() {
        _actionState.setValue(new AssessmentActionState.Idle());
    }

    // ------------------------------------------------------------------ //
    //  Load list                                                          //
    // ------------------------------------------------------------------ //

    /** Fetch page 1 of the assessment list. */
    public void loadAssessments(Context ctx) {
        _listState.setValue(new AssessmentListState.Loading());

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .getAssessments(1, 20)
                .enqueue(new Callback<AssessmentsListResponse>() {
                    @Override
                    public void onResponse(Call<AssessmentsListResponse> call,
                                           Response<AssessmentsListResponse> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            List<Assessment> list = response.body().getAssessments();
                            _listState.postValue(new AssessmentListState.Success(
                                    list != null ? list : new ArrayList<>()));
                        } else {
                            _listState.postValue(
                                    new AssessmentListState.Error("Failed to load assessments."));
                        }
                    }

                    @Override
                    public void onFailure(Call<AssessmentsListResponse> call, Throwable t) {
                        _listState.postValue(new AssessmentListState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Create                                                             //
    // ------------------------------------------------------------------ //

    public void createAssessment(Context ctx, String title, String content, String status) {
        _actionState.setValue(new AssessmentActionState.Loading());

        AssessmentCreateRequest req = new AssessmentCreateRequest(title, content, status);
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .createAssessment(req)
                .enqueue(new Callback<AssessmentDetailResponse>() {
                    @Override
                    public void onResponse(Call<AssessmentDetailResponse> call,
                                           Response<AssessmentDetailResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            _actionState.postValue(
                                    new AssessmentActionState.Success("Assessment created."));
                        } else {
                            _actionState.postValue(
                                    new AssessmentActionState.Error("Failed to create assessment."));
                        }
                    }

                    @Override
                    public void onFailure(Call<AssessmentDetailResponse> call, Throwable t) {
                        _actionState.postValue(new AssessmentActionState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Update                                                             //
    // ------------------------------------------------------------------ //

    public void updateAssessment(Context ctx, int id, String title, String content,
                                 String status) {
        _actionState.setValue(new AssessmentActionState.Loading());

        AssessmentUpdateRequest req = new AssessmentUpdateRequest(title, content, status);
        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .updateAssessment(id, req)
                .enqueue(new Callback<AssessmentDetailResponse>() {
                    @Override
                    public void onResponse(Call<AssessmentDetailResponse> call,
                                           Response<AssessmentDetailResponse> response) {
                        if (response.isSuccessful()
                                && response.body() != null
                                && response.body().isSuccess()) {
                            _actionState.postValue(
                                    new AssessmentActionState.Success("Assessment saved."));
                        } else {
                            _actionState.postValue(
                                    new AssessmentActionState.Error("Failed to save assessment."));
                        }
                    }

                    @Override
                    public void onFailure(Call<AssessmentDetailResponse> call, Throwable t) {
                        _actionState.postValue(new AssessmentActionState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }

    // ------------------------------------------------------------------ //
    //  Delete                                                             //
    // ------------------------------------------------------------------ //

    public void deleteAssessment(Context ctx, int id) {
        _actionState.setValue(new AssessmentActionState.Loading());

        ApiClient.getInstance(ctx.getApplicationContext())
                .getApiService()
                .deleteAssessment(id)
                .enqueue(new Callback<GenericResponse>() {
                    @Override
                    public void onResponse(Call<GenericResponse> call,
                                           Response<GenericResponse> response) {
                        // Treat any 2xx as success
                        _actionState.postValue(
                                new AssessmentActionState.Success("Assessment deleted."));
                    }

                    @Override
                    public void onFailure(Call<GenericResponse> call, Throwable t) {
                        _actionState.postValue(new AssessmentActionState.Error(
                                t.getMessage() != null ? t.getMessage() : "Network error."));
                    }
                });
    }
}
