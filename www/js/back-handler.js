/**
 * iSeeGrass — Android Back-Button Handler
 *
 * Exposes window.iSeeGrassHandleBack() which is called by
 * MainActivity.java's onBackPressed() override.
 *
 * Exits the app via window.AndroidBridge.exitApp() — a JavascriptInterface
 * registered by MainActivity.java that calls Activity.finish() natively.
 *
 * Behaviour by section:
 *
 *  /views/users/*  → navigate to /views/users/index.html
 *                    If already on index: show toast, exit on 2nd press
 *  /views/admin/*  → navigate to /views/admin/index.html
 *                    If already on index: same double-press-to-exit
 *  /views/auth/*   → navigate to /index.html (landing page)
 *  public/guest    → exit immediately (no account required)
 *
 * On the web browser this function is registered but never called
 * (MainActivity.java only runs in the Android APK).
 */

(function () {
  'use strict';

  /* ─── Destination paths ──────────────────────────────────────────── */
  var USER_HOME  = '/views/users/index.html';
  var ADMIN_HOME = '/views/admin/index.html';
  var LANDING    = '/index.html';

  /* ─── Current path ───────────────────────────────────────────────── */
  function currentPath() {
    return window.location.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  /* ─── Toast ──────────────────────────────────────────────────────── */
  var toastEl    = null;
  var toastTimer = null;

  function showExitToast() {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = [
        'position:fixed',
        'bottom:1.75rem',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(18,18,18,0.92)',
        'color:#ffffff',
        'padding:0.7rem 1.5rem',
        'border-radius:999px',
        'font-size:0.92rem',
        'font-weight:600',
        'z-index:2147483647',
        'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
        'pointer-events:none',
        'white-space:nowrap',
        'opacity:0',
        'transition:opacity 180ms ease',
      ].join(';');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = 'Press back again to exit';
    void toastEl.offsetHeight;          // force reflow → CSS transition fires
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.opacity = '0';
    }, 2200);
  }

  function hideToast() {
    if (toastEl) toastEl.style.opacity = '0';
    clearTimeout(toastTimer);
  }

  /* ─── Double-press-to-exit ───────────────────────────────────────── */
  var pressedOnce = false;
  var pressTimer  = null;

  function armExit() {
    pressedOnce = true;
    showExitToast();
    pressTimer = setTimeout(function () {
      pressedOnce = false;
      hideToast();
    }, 2200);
  }

  /* ─── Exit via the JavascriptInterface added by MainActivity.java ── */
  function exitApp() {
    clearTimeout(pressTimer);
    hideToast();
    if (window.AndroidBridge) {
      window.AndroidBridge.exitApp();
    }
    // If AndroidBridge is somehow unavailable (edge case), do nothing —
    // the user can try the system home button.
  }

  /* ─── Navigate ───────────────────────────────────────────────────── */
  function goTo(path) {
    window.location.replace(path);
  }

  /* ─── Main handler — called by MainActivity.java ─────────────────── */
  window.iSeeGrassHandleBack = function () {
    var path = currentPath();

    /* ── User pages ── */
    if (path.indexOf('/views/users/') !== -1) {
      var onUserHome = path.indexOf('/users/index.html') !== -1;
      if (onUserHome) {
        if (pressedOnce) { exitApp(); } else { armExit(); }
      } else {
        pressedOnce = false; hideToast();
        goTo(USER_HOME);
      }
      return;
    }

    /* ── Admin pages ── */
    if (path.indexOf('/views/admin/') !== -1) {
      var onAdminHome = path.indexOf('/admin/index.html') !== -1;
      if (onAdminHome) {
        if (pressedOnce) { exitApp(); } else { armExit(); }
      } else {
        pressedOnce = false; hideToast();
        goTo(ADMIN_HOME);
      }
      return;
    }

    /* ── Auth pages → go to landing ── */
    if (path.indexOf('/views/auth/') !== -1) {
      pressedOnce = false; hideToast();
      goTo(LANDING);
      return;
    }

    /* ── Public / guest / landing → exit directly ── */
    exitApp();
  };

})();
