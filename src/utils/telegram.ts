// Утилиты для работы с Telegram WebApp
export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const initTelegramWebApp = () => {
  const webApp = getTelegramWebApp();
  if (webApp) {
    try {
      webApp.ready();
      webApp.expand();
      // Apply dark theme to Telegram native header and background
      if (typeof webApp.setHeaderColor === 'function') webApp.setHeaderColor('#000000');
      if (typeof webApp.setBackgroundColor === 'function') webApp.setBackgroundColor('#000000');
    } catch {}

    const updateSafeArea = () => {
      try {
        const root = document.documentElement;
        const safeArea = (webApp as any).safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
        const contentSafeArea = (webApp as any).contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
        const isFullscreen = !!((webApp as any).isFullscreen);
        const platform = String((webApp as any).platform || '').toLowerCase();
        const isMobile = /ios|android/i.test(platform) || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        root.classList.add('tg-webapp');
        root.classList.toggle('tg-fullscreen', isFullscreen);
        root.classList.toggle('tg-mobile', isMobile);

        // Telegram paints ✕ Close over the webview. contentSafeArea.top (Bot API 8+)
        // is the official inset, but many clients still report 0 — always keep a
        // floor so page titles never sit under the close control.
        const rawSafeTop = Number(safeArea.top) || 0;
        const contentTop = Number(contentSafeArea.top) || 0;
        const closeBar = isFullscreen ? 88 : 80;
        const topInset = Math.max(contentTop, rawSafeTop > 0 ? rawSafeTop + 48 : 0, closeBar);

        const bottomInset = Number(contentSafeArea.bottom) || Number(safeArea.bottom) || 0;

        root.style.setProperty('--app-top-safe-area', `${topInset}px`);
        root.style.setProperty('--tg-content-safe-area-inset-top', `${topInset}px`);
        root.style.setProperty('--app-bottom-safe-area', `${bottomInset}px`);
      } catch (err) {
        console.warn('[Telegram WebApp] Error updating safe area:', err);
      }
    };

    updateSafeArea();

    // Listen for safe area and fullscreen changes from Telegram WebApp
    try {
      webApp.onEvent('safeAreaChanged', updateSafeArea);
      webApp.onEvent('contentSafeAreaChanged', updateSafeArea);
      webApp.onEvent('fullscreenChanged', updateSafeArea);
      webApp.onEvent('viewportChanged', updateSafeArea);
    } catch {}

    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return webApp;
  }
  return null;
};

export const getUserData = () => {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe?.user || null;
};

export const getInitData = () => {
  const webApp = getTelegramWebApp();
  return webApp?.initData || '';
};
