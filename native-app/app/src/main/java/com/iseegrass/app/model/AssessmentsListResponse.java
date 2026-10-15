package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

import java.util.List;

public class AssessmentsListResponse {

    @SerializedName("assessments")
    private List<Assessment> assessments;

    @SerializedName("total")
    private int total;

    @SerializedName("page")
    private int page;

    @SerializedName("limit")
    private int limit;

    public List<Assessment> getAssessments() { return assessments; }
    public int              getTotal()       { return total; }
    public int              getPage()        { return page; }
    public int              getLimit()       { return limit; }
}
