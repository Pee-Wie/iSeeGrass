package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class ChangePasswordRequest {

    @SerializedName("current_password")
    private final String currentPassword;

    @SerializedName("new_password")
    private final String newPassword;

    public ChangePasswordRequest(String currentPassword, String newPassword) {
        this.currentPassword = currentPassword;
        this.newPassword     = newPassword;
    }

    public String getCurrentPassword() { return currentPassword; }
    public String getNewPassword()     { return newPassword; }
}
