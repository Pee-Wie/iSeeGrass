package com.iseegrass.native_app.model;

import com.google.gson.annotations.SerializedName;

public class Identification {

    @SerializedName("id")
    private int id;

    @SerializedName("image_filename")
    private String imageFilename;

    @SerializedName("image_url")
    private String imageUrl;

    @SerializedName("top_result")
    private String topResult;

    @SerializedName("top_confidence")
    private Double topConfidence;

    @SerializedName("identification_method")
    private String identificationMethod;

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("title")
    private String title;

    @SerializedName("latitude")
    private Double latitude;

    @SerializedName("longitude")
    private Double longitude;

    public int    getId()            { return id; }
    public String getImageFilename() { return imageFilename; }
    public String getImageUrl()      { return imageUrl; }
    public String getTopResult()     { return topResult; }
    public Double getTopConfidence() { return topConfidence; }
    public String getIdentificationMethod() { return identificationMethod; }
    public boolean isManual() { return "manual_key".equals(identificationMethod); }
    public String getCreatedAt()     { return createdAt; }
    public String getTitle()         { return title; }
    public Double getLatitude()       { return latitude; }
    public Double getLongitude()      { return longitude; }
}
