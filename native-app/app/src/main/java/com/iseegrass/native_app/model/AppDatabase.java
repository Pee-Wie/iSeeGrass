package com.iseegrass.native_app.model;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.List;

/**
 * Lightweight SQLite database for the iSeeGrass native app.
 *
 * Manages the offline identification queue — records produced by
 * on-device TFLite inference that have not yet been synced to the server.
 *
 * Uses the Android SDK's built-in {@link SQLiteOpenHelper}; no extra
 * dependencies needed.
 */
public class AppDatabase extends SQLiteOpenHelper {

    private static final String DB_NAME    = "iseegrass_local.db";
    private static final int    DB_VERSION = 3;

    // ── Table ──────────────────────────────────────────────────────────
    private static final String TABLE = "offline_identifications";

    private static final String COL_ID             = "id";
    private static final String COL_TOP_RESULT     = "top_result";
    private static final String COL_TOP_CONFIDENCE = "top_confidence";
    private static final String COL_TITLE          = "title";
    private static final String COL_IMAGE_PATH     = "image_path";
    private static final String COL_CREATED_AT     = "created_at";
    private static final String COL_STATUS         = "status";
    private static final String COL_SERVER_ID      = "server_id";
    private static final String COL_METHOD         = "identification_method";
    private static final String COL_LATITUDE       = "latitude";
    private static final String COL_LONGITUDE      = "longitude";

    private static volatile AppDatabase INSTANCE;

    // ------------------------------------------------------------------ //
    //  Singleton                                                          //
    // ------------------------------------------------------------------ //

    public static AppDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = new AppDatabase(context.getApplicationContext());
                }
            }
        }
        return INSTANCE;
    }

    private AppDatabase(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    // ------------------------------------------------------------------ //
    //  Schema                                                             //
    // ------------------------------------------------------------------ //

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS " + TABLE + " ("
            + COL_ID             + " INTEGER PRIMARY KEY AUTOINCREMENT,"
            + COL_TOP_RESULT     + " TEXT    NOT NULL DEFAULT '',"
            + COL_TOP_CONFIDENCE + " REAL    NOT NULL DEFAULT 0,"
            + COL_TITLE         + " TEXT,"
            + COL_IMAGE_PATH    + " TEXT,"
            + COL_CREATED_AT    + " TEXT    NOT NULL DEFAULT '',"
            + COL_STATUS        + " TEXT    NOT NULL DEFAULT 'PENDING',"
            + COL_SERVER_ID     + " INTEGER NOT NULL DEFAULT 0,"
            + COL_METHOD        + " TEXT    NOT NULL DEFAULT 'cnn',"
            + COL_LATITUDE      + " REAL,"
            + COL_LONGITUDE     + " REAL"
            + ")"
        );
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE " + TABLE
                    + " ADD COLUMN " + COL_METHOD + " TEXT NOT NULL DEFAULT 'cnn'");
        }
        if (oldVersion < 3) {
            db.execSQL("ALTER TABLE " + TABLE + " ADD COLUMN " + COL_LATITUDE + " REAL");
            db.execSQL("ALTER TABLE " + TABLE + " ADD COLUMN " + COL_LONGITUDE + " REAL");
        }
    }

    // ------------------------------------------------------------------ //
    //  Write operations                                                   //
    // ------------------------------------------------------------------ //

    /** Insert a new pending offline record. Returns the new row id. */
    public long insert(OfflineIdentification record) {
        ContentValues cv = new ContentValues();
        cv.put(COL_TOP_RESULT,     record.topResult     != null ? record.topResult : "");
        cv.put(COL_TOP_CONFIDENCE, record.topConfidence);
        cv.put(COL_TITLE,          record.title);
        cv.put(COL_IMAGE_PATH,     record.imagePath);
        cv.put(COL_CREATED_AT,     record.createdAt     != null ? record.createdAt : "");
        cv.put(COL_STATUS,         OfflineIdentification.STATUS_PENDING);
        cv.put(COL_SERVER_ID,      0);
        cv.put(COL_METHOD,         record.identificationMethod != null
                ? record.identificationMethod : "cnn");
        cv.put(COL_LATITUDE,       record.latitude);
        cv.put(COL_LONGITUDE,      record.longitude);
        return getWritableDatabase().insert(TABLE, null, cv);
    }

    /** Mark a local record as synced and store the server-assigned id. */
    public void markSynced(int localId, int serverId) {
        ContentValues cv = new ContentValues();
        cv.put(COL_STATUS,    OfflineIdentification.STATUS_SYNCED);
        cv.put(COL_SERVER_ID, serverId);
        getWritableDatabase().update(TABLE, cv, COL_ID + "=?",
                new String[]{String.valueOf(localId)});
    }

    /** Delete a single local record. */
    public void deleteById(int localId) {
        getWritableDatabase().delete(TABLE, COL_ID + "=?",
                new String[]{String.valueOf(localId)});
    }

    /** Delete all local records. */
    public void deleteAll() {
        getWritableDatabase().delete(TABLE, null, null);
    }

    // ------------------------------------------------------------------ //
    //  Read operations                                                    //
    // ------------------------------------------------------------------ //

    /** Return all records with PENDING status, oldest first. */
    public List<OfflineIdentification> getPending() {
        return query("status=?",
                new String[]{OfflineIdentification.STATUS_PENDING},
                COL_ID + " ASC");
    }

    /** Return all records, newest first. */
    public List<OfflineIdentification> getAll() {
        return query(null, null, COL_ID + " DESC");
    }

    // ------------------------------------------------------------------ //
    //  Helpers                                                            //
    // ------------------------------------------------------------------ //

    private List<OfflineIdentification> query(String selection,
                                              String[] selectionArgs,
                                              String orderBy) {
        List<OfflineIdentification> results = new ArrayList<>();
        try (Cursor c = getReadableDatabase().query(
                TABLE, null, selection, selectionArgs, null, null, orderBy)) {
            while (c.moveToNext()) {
                OfflineIdentification r = new OfflineIdentification();
                r.id             = c.getInt(c.getColumnIndexOrThrow(COL_ID));
                r.topResult      = c.getString(c.getColumnIndexOrThrow(COL_TOP_RESULT));
                r.topConfidence  = c.getDouble(c.getColumnIndexOrThrow(COL_TOP_CONFIDENCE));
                r.title          = c.getString(c.getColumnIndexOrThrow(COL_TITLE));
                r.imagePath      = c.getString(c.getColumnIndexOrThrow(COL_IMAGE_PATH));
                r.createdAt      = c.getString(c.getColumnIndexOrThrow(COL_CREATED_AT));
                r.status         = c.getString(c.getColumnIndexOrThrow(COL_STATUS));
                r.serverId       = c.getInt(c.getColumnIndexOrThrow(COL_SERVER_ID));
                r.identificationMethod = c.getString(
                        c.getColumnIndexOrThrow(COL_METHOD));
                int latitudeIndex = c.getColumnIndexOrThrow(COL_LATITUDE);
                int longitudeIndex = c.getColumnIndexOrThrow(COL_LONGITUDE);
                r.latitude = c.isNull(latitudeIndex) ? null : c.getDouble(latitudeIndex);
                r.longitude = c.isNull(longitudeIndex) ? null : c.getDouble(longitudeIndex);
                results.add(r);
            }
        }
        return results;
    }
}
