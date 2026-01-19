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
    webApp.ready();
    webApp.expand();
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
