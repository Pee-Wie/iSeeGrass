package com.iseegrass.app.model;

import com.google.gson.annotations.SerializedName;

/**
 * Assessment model.
 * status values: "draft" | "in_progress" | "finalized"
 * title, content, and status have setters because the editor mutates them.
 */
public class Assessment {

    @SerializedName("id")
    private int id;

    @SerializedName("title")
    private String title;

    @SerializedName("content")
    private String content;

    @SerializedName("status")
    private String status;

    @SerializedName("created_at")
    private String createdAt;

    @SerializedName("updated_at")
    private String updatedAt;

    @SerializedName("user_id")
    private int userId;

    // Getters
    public int    getId()        { return id; }
    public String getTitle()     { return title; }
    public String getContent()   { return content; }
    public String getStatus()    { return status; }
    public String getCreatedAt() { return createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public int    getUserId()    { return userId; }

    // Setters for mutable editor fields
    public void setTitle(String title)     { this.title   = title; }
    public void setContent(String content) { this.content = content; }
    public void setStatus(String status)   { this.status  = status; }
}
