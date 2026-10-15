package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

public class User {

    @SerializedName("id")
    private int id;

    @SerializedName("username")
    private String username;

    @SerializedName("email")
    private String email;

    @SerializedName("first_name")
    private String firstName;

    @SerializedName("last_name")
    private String lastName;

    @SerializedName("position")
    private String position;

    @SerializedName("institution")
    private String institution;

    @SerializedName("avatar_filename")
    private String avatarFilename;

    public int getId()             { return id; }
    public String getUsername()    { return username; }
    public String getEmail()       { return email; }
    public String getFirstName()   { return firstName; }
    public String getLastName()    { return lastName; }
    public String getPosition()    { return position; }
    public String getInstitution() { return institution; }
    public String getAvatarFilename() { return avatarFilename; }

    /** Convenience: "First Last", falls back to username if names are blank. */
    public String getFullName() {
        String fn = firstName != null ? firstName.trim() : "";
        String ln = lastName  != null ? lastName.trim()  : "";
        String full = (fn + " " + ln).trim();
        return full.isEmpty() ? (username != null ? username : "") : full;
    }
}
