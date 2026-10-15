package com.iseegrass.app.network;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.ArrayList;
import java.util.List;

import okhttp3.Cookie;
import okhttp3.CookieJar;
import okhttp3.HttpUrl;

/**
 * A CookieJar backed by SharedPreferences.
 * Persists cookies across app restarts by serialising them to JSON via Gson.
 */
public class PersistentCookieJar implements CookieJar {

    private final SharedPreferences prefs;
    private final Gson gson;

    public PersistentCookieJar(Context context) {
        this.prefs = context.getApplicationContext()
                .getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE);
        this.gson = new Gson();
    }

    // ------------------------------------------------------------------ //
    //  CookieJar contract                                                  //
    // ------------------------------------------------------------------ //

    @Override
    public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
        // Load what is already stored so we can merge without duplicating.
        List<Cookie> existing = loadAll();

        for (Cookie incoming : cookies) {
            // Replace a cookie with the same name+domain+path if it already exists.
            existing.removeIf(c ->
                    c.name().equals(incoming.name())
                    && c.domain().equals(incoming.domain())
                    && c.path().equals(incoming.path()));
            existing.add(incoming);
        }

        persist(existing);
    }

    @Override
    public List<Cookie> loadForRequest(HttpUrl url) {
        List<Cookie> matching = new ArrayList<>();
        for (Cookie cookie : loadAll()) {
            if (cookie.matches(url)) {
                matching.add(cookie);
            }
        }
        return matching;
    }

    // ------------------------------------------------------------------ //
    //  Public helpers                                                      //
    // ------------------------------------------------------------------ //

    /** Wipes all stored cookies (call on logout). */
    public void clear() {
        prefs.edit().remove(Constants.KEY_COOKIES).apply();
    }

    // ------------------------------------------------------------------ //
    //  Serialisation helpers                                               //
    // ------------------------------------------------------------------ //

    private List<Cookie> loadAll() {
        String json = prefs.getString(Constants.KEY_COOKIES, null);
        List<Cookie> cookies = new ArrayList<>();
        if (json == null || json.isEmpty()) {
            return cookies;
        }
        try {
            JsonArray array = JsonParser.parseString(json).getAsJsonArray();
            for (int i = 0; i < array.size(); i++) {
                Cookie c = deserialize(array.get(i).getAsJsonObject());
                if (c != null) {
                    cookies.add(c);
                }
            }
        } catch (Exception e) {
            // Corrupt data — start fresh.
            prefs.edit().remove(Constants.KEY_COOKIES).apply();
        }
        return cookies;
    }

    private void persist(List<Cookie> cookies) {
        JsonArray array = new JsonArray();
        for (Cookie c : cookies) {
            array.add(serialize(c));
        }
        prefs.edit().putString(Constants.KEY_COOKIES, array.toString()).apply();
    }

    private JsonObject serialize(Cookie cookie) {
        JsonObject obj = new JsonObject();
        obj.addProperty("name",      cookie.name());
        obj.addProperty("value",     cookie.value());
        obj.addProperty("domain",    cookie.domain());
        obj.addProperty("path",      cookie.path());
        obj.addProperty("expiresAt", cookie.expiresAt());
        obj.addProperty("secure",    cookie.secure());
        obj.addProperty("httpOnly",  cookie.httpOnly());
        return obj;
    }

    private Cookie deserialize(JsonObject obj) {
        try {
            String name      = obj.get("name").getAsString();
            String value     = obj.get("value").getAsString();
            String domain    = obj.get("domain").getAsString();
            String path      = obj.get("path").getAsString();
            long   expiresAt = obj.get("expiresAt").getAsLong();
            boolean secure   = obj.get("secure").getAsBoolean();
            boolean httpOnly = obj.get("httpOnly").getAsBoolean();

            Cookie.Builder builder = new Cookie.Builder()
                    .name(name)
                    .value(value)
                    .path(path)
                    .expiresAt(expiresAt);

            // domain() vs hostOnlyDomain() — use domain() for cross-subdomain cookies
            builder.domain(domain);

            if (secure)   builder.secure();
            if (httpOnly) builder.httpOnly();

            return builder.build();
        } catch (Exception e) {
            return null;
        }
    }
}
