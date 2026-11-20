import { readRoute, navigateTo } from './router.js';

// Use Capacitor's official App plugin only on Android. Web and iOS rely on the
// same History API / popstate router; no extra navigation state is stored.
export function installAndroidBackNavigation() {
  const cap = window.Capacitor;
  if (cap?.getPlatform?.() !== 'android') return;
  const app = cap.Plugins?.App;
  if (!app?.addListener) return;
  app.addListener('backButton', ({ canGoBack }) => {
    // A visible dialog has priority over page navigation.
    const dialog = document.querySelector('dialog[open]');
    if (dialog) {
      dialog.close();
      return;
    }
    if (canGoBack) {
      window.history.back();
      return;
    }
    if (readRoute().page !== 'home') {
      navigateTo('home', null, { replace: true });
      return;
    }
    // Only exit at the root when there is no WebView history left.
    app.exitApp();
  }).catch(error => console.error('Goosh Android Back handler:', error));
}
