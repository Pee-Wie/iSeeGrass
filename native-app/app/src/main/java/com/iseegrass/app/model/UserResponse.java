package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class UserResponse {

    @SerializedName("success")
    private boolean success;

    @SerializedName("user")
    private User user;

    public boolean isSuccess() { return success; }
    public User    getUser()   { return user; }
}
