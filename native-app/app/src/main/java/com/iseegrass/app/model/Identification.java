package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class Identification {

    @SerializedName("id")
    private int id;

    @SerializedName("image_filename")
    private String imageFilename;

    @SerializedName("top_result")
    private String topResult;

    @SerializedName("top_confidence")
    private double topConfidence;

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("title")
    private String title;

    public int    getId()            { return id; }
    public String getImageFilename() { return imageFilename; }
    public String getTopResult()     { return topResult; }
    public double getTopConfidence() { return topConfidence; }
    public String getCreatedAt()     { return createdAt; }
    public String getTitle()         { return title; }
}
