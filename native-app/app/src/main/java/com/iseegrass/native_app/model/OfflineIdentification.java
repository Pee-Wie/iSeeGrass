package com.iseegrass.native_app.model;

/**
 * Plain Java model for a locally-saved TFLite identification result
 * that has not yet been synced to the server.
 *
 * Stored in the local SQLite database via {@link AppDatabase}.
 * When the app comes back online, OfflineSyncManager uploads every
 * PENDING record and marks it SYNCED on success.
 */
public class OfflineIdentification {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_SYNCED  = "SYNCED";

    public int    id;            // local SQLite auto-increment id
    public String topResult;     // predicted species label
    public double topConfidence; // confidence in [0, 1]
    public String identificationMethod; // cnn | manual_key
    public String title;         // optional user-supplied title
    public String imagePath;     // content:// URI or file path of the source image
    public String createdAt;     // ISO-8601 timestamp of local inference
    public Double latitude;
    public Double longitude;
    public String status;        // PENDING | SYNCED
    public int    serverId;      // server-assigned id after sync (0 = not yet synced)
}
