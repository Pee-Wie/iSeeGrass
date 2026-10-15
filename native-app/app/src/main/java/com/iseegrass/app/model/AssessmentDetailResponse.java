package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class AssessmentDetailResponse {

    @SerializedName("success")
    private boolean success;

    @SerializedName("assessment")
    private Assessment assessment;

    // Some endpoints return top-level fields mirroring the assessment object;
    // keep them here so Gson can populate whichever shape the server returns.

    @SerializedName("id")
    private int id;

    @SerializedName("title")
    private String title;

    @SerializedName("content")
    private String content;

    @SerializedName("status")
    private String status;

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("updated_at")
    private String updatedAt;

    public boolean    isSuccess()    { return success; }
    public Assessment getAssessment() { return assessment; }
    public int        getId()        { return id; }
    public String     getTitle()     { return title; }
    public String     getContent()   { return content; }
    public String     getStatus()    { return status; }
    public String     getCreatedAt() { return createdAt; }
    public String     getUpdatedAt() { return updatedAt; }
}
