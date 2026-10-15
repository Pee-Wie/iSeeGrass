package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

/**
 * All three fields are optional/nullable — send only the ones you want to change.
 * Gson will omit null fields by default; use GsonBuilder().serializeNulls() only
 * if the server requires explicit nulls.
 */
public class AssessmentUpdateRequest {

    @SerializedName("title")
    private final String title;

    @SerializedName("content")
    private final String content;

    @SerializedName("status")
    private final String status;

    public AssessmentUpdateRequest(String title, String content, String status) {
        this.title   = title;
        this.content = content;
        this.status  = status;
    }

    public String getTitle()   { return title; }
    public String getContent() { return content; }
    public String getStatus()  { return status; }
}
