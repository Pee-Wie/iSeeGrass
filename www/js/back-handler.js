(function () {
  'use strict';

  function showNoPreviousPageToast() {
    var toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.textContent = 'You are already on the first page.';
    toast.style.cssText = [
      'position:fixed',
      'bottom:1.75rem',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(18,18,18,0.92)',
      'color:#fff',
      'padding:0.7rem 1.2rem',
      'border-radius:999px',
      'font-size:0.9rem',
      'z-index:2147483647',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 1800);
  }

  function goBack(canGoBack) {
    if (canGoBack || window.history.length > 1) {
      window.history.back();
      return;
    }
    showNoPreviousPageToast();
  }

  window.iSeeGrassHandleBack = function () {
    goBack(window.history.length > 1);
  };

  var capacitor = window.Capacitor;
  if (!capacitor || !capacitor.isNativePlatform || !capacitor.isNativePlatform()) return;

  if (!capacitor.isPluginAvailable || !capacitor.isPluginAvailable('App') || !capacitor.registerPlugin) {
    console.error('Capacitor App plugin is unavailable; run npx cap sync android.');
    return;
  }

  capacitor.registerPlugin('App').addListener('backButton', function (event) {
    goBack(event.canGoBack);
  }).catch(function (error) {
    console.error('Could not register the Capacitor back-button handler.', error);
  });
})();
