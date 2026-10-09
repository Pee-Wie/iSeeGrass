package com.iseegrass.app;

import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity — iSeeGrass
 *
 * Two things happen here:
 *
 * 1. A JavaScript interface "AndroidBridge" is added to the WebView so
 *    that www/js/back-handler.js can call
 *      AndroidBridge.exitApp()
 *    to finish() the Activity cleanly.
 *
 * 2. onBackPressed() is overridden to call window.iSeeGrassHandleBack()
 *    in the WebView instead of exiting immediately. That JS function
 *    (registered by back-handler.js) decides whether to navigate,
 *    show a toast, or call AndroidBridge.exitApp().
 */
public class MainActivity extends BridgeActivity {

    // ── JavaScript interface exposed to the WebView ──────────────────
    public class AndroidBridge {

        /** Called from JS: AndroidBridge.exitApp() */
        @JavascriptInterface
        public void exitApp() {
            // Must finish() on the UI thread
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }
    }

    // ── Register the interface once the bridge is ready ──────────────
    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        // "AndroidBridge" becomes the global JS object name
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
    }

    // ── Intercept the Android back button ────────────────────────────
    @Override
    public void onBackPressed() {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                // Call our JS handler if it exists on the current page.
                // If the page hasn't loaded back-handler.js yet, fall back
                // to AndroidBridge.exitApp() directly.
                getBridge().getWebView().evaluateJavascript(
                    "(function(){" +
                    "  if(typeof window.iSeeGrassHandleBack==='function'){" +
                    "    window.iSeeGrassHandleBack();" +
                    "  } else {" +
                    "    AndroidBridge.exitApp();" +
                    "  }" +
                    "})();",
                    null
                );
            }
        });
    }
}
