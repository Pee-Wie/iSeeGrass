package com.iseegrass.app.network;

import com.iseegrass.app.model.AssessmentCreateRequest;
import com.iseegrass.app.model.AssessmentDetailResponse;
import com.iseegrass.app.model.AssessmentUpdateRequest;
import com.iseegrass.app.model.AssessmentsListResponse;
import com.iseegrass.app.model.AvatarResponse;
import com.iseegrass.app.model.ChangePasswordRequest;
import com.iseegrass.app.model.GenericResponse;
import com.iseegrass.app.model.HistoryResponse;
import com.iseegrass.app.model.IdentifyResponse;
import com.iseegrass.app.model.LoginRequest;
import com.iseegrass.app.model.LoginResponse;
import com.iseegrass.app.model.MeResponse;
import com.iseegrass.app.model.UpdateTitleRequest;
import com.iseegrass.app.model.UserResponse;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Part;
import retrofit2.http.Query;

/**
 * Retrofit interface declaring every API endpoint used by the iSeeGrass native app.
 *
 * All calls are synchronous-friendly (Call<T>); execute on a background thread
 * or wrap in a ViewModel / LiveData / coroutine bridge as needed.
 */
public interface ApiService {

    // ================================================================== //
    //  Auth                                                               //
    // ================================================================== //

    @POST("api/auth/login")
    Call<LoginResponse> login(@Body LoginRequest body);

    @POST("api/auth/logout")
    Call<GenericResponse> logout();

    @GET("api/auth/me")
    Call<MeResponse> getMe();

    // ================================================================== //
    //  Identification                                                     //
    // ================================================================== //

    /**
     * Submit a photo for grass identification.
     *
     * @param image     The image part — create with MultipartBody.Part.createFormData(...)
     * @param modelType "75" or the model identifier expected by the server
     */
    @Multipart
    @POST("api/identify")
    Call<IdentifyResponse> identify(
            @Part MultipartBody.Part image,
            @Part("model_type") RequestBody modelType
    );

    /**
     * Paginated identification history for the logged-in user.
     *
     * @param limit  Number of records per page
     * @param offset Zero-based record offset
     */
    @GET("api/identifications/user-history")
    Call<HistoryResponse> getHistory(
            @Query("limit")  int limit,
            @Query("offset") int offset
    );

    /** Hard-delete a single identification record. */
    @DELETE("api/identifications/user-delete")
    Call<GenericResponse> deleteIdentification(@Query("id") int id);

    /** Hard-delete all identification records for the logged-in user. */
    @DELETE("api/identifications/user-delete-all")
    Call<GenericResponse> deleteAllIdentifications();

    /** Rename / update the title of an identification record. */
    @PUT("api/identifications/user-update-title")
    Call<GenericResponse> updateTitle(@Body UpdateTitleRequest body);

    // ================================================================== //
    //  Assessments                                                        //
    // ================================================================== //

    /**
     * Paginated list of assessments for the logged-in user.
     *
     * @param page  1-based page number
     * @param limit Records per page
     */
    @GET("api/assessments")
    Call<AssessmentsListResponse> getAssessments(
            @Query("page")  int page,
            @Query("limit") int limit
    );

    /** Fetch a single assessment by id. */
    @GET("api/assessments/show")
    Call<AssessmentDetailResponse> getAssessment(@Query("id") int id);

    /** Create a new assessment. */
    @POST("api/assessments/create")
    Call<AssessmentDetailResponse> createAssessment(@Body AssessmentCreateRequest body);

    /**
     * Update an existing assessment.
     *
     * @param id   ID of the assessment to update (passed as query param)
     * @param body Fields to update (all optional — omit null fields)
     */
    @PUT("api/assessments/update")
    Call<AssessmentDetailResponse> updateAssessment(
            @Query("id") int id,
            @Body AssessmentUpdateRequest body
    );

    /** Delete an assessment by id. */
    @DELETE("api/assessments/delete")
    Call<GenericResponse> deleteAssessment(@Query("id") int id);

    // ================================================================== //
    //  Users / Profile                                                    //
    // ================================================================== //

    /** Get a user's profile by id. */
    @GET("api/users/show")
    Call<UserResponse> getUser(@Query("id") int id);

    /** Change the logged-in user's password. */
    @POST("api/users/change_password")
    Call<GenericResponse> changePassword(
            @Query("id") int id,
            @Body ChangePasswordRequest body
    );

    /** Upload a new avatar image for the logged-in user. */
    @Multipart
    @POST("api/users/avatar")
    Call<AvatarResponse> uploadAvatar(@Part MultipartBody.Part avatar);

    /** Delete the logged-in user's avatar and revert to default. */
    @DELETE("api/users/avatar")
    Call<GenericResponse> deleteAvatar();
}
