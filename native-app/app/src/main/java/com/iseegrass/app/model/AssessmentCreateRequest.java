package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class AssessmentCreateRequest {

    @SerializedName("title")
    private final String title;

    @SerializedName("content")
    private final String content;

    @SerializedName("status")
    private final String status;

    public AssessmentCreateRequest(String title, String content, String status) {
        this.title   = title;
        this.content = content;
        this.status  = status;
    }

    public String getTitle()   { return title; }
    public String getContent() { return content; }
    public String getStatus()  { return status; }
}
