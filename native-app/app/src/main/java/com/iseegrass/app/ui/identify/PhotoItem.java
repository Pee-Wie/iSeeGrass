package com.iseegrass.app.ui.identify;

import android.net.Uri;

/**
 * Model helper for a single photo in the collector grid.
 * Holds the content URI, an optional user-supplied title, and
 * a transient selection flag used during bulk-delete mode.
 */
public class PhotoItem {

    private Uri imageUri;
    private String title;
    private boolean selected;

    public PhotoItem(Uri imageUri, String title) {
        this.imageUri = imageUri;
        this.title = title != null ? title : "";
        this.selected = false;
    }

    // ------------------------------------------------------------------ //
    //  Getters / setters                                                  //
    // ------------------------------------------------------------------ //

    public Uri getImageUri() { return imageUri; }
    public void setImageUri(Uri imageUri) { this.imageUri = imageUri; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title != null ? title : ""; }

    public boolean isSelected() { return selected; }
    public void setSelected(boolean selected) { this.selected = selected; }
}
