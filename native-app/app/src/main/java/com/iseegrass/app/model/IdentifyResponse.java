package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class IdentifyResponse {

    @SerializedName("success")
    private boolean success;

    @SerializedName("data")
    private IdentificationResult data;

    public boolean              isSuccess() { return success; }
    public IdentificationResult getData()   { return data; }
}
