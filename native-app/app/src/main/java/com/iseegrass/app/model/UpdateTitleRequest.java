package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class UpdateTitleRequest {

    @SerializedName("id")
    private final int id;

    @SerializedName("title")
    private final String title;

    public UpdateTitleRequest(int id, String title) {
        this.id    = id;
        this.title = title;
    }

    public int    getId()    { return id; }
    public String getTitle() { return title; }
}
