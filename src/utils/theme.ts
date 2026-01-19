// Утилиты для работы с темой Telegram
import { getTelegramWebApp } from './telegram';

export const applyTelegramTheme = () => {
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    // Fallback: определяем тему по системным настройкам
    applySystemTheme();
    return;
  }

  const theme = webApp.themeParams;
  const colorScheme = webApp.colorScheme;

  // Применяем цвета из Telegram
  const root = document.documentElement;

  // Основные цвета
  root.style.setProperty(
    '--tg-theme-bg-color',
    theme.bg_color || (colorScheme === 'dark' ? '#212121' : '#ffffff')
  );
  
  root.style.setProperty(
    '--tg-theme-text-color',
    theme.text_color || (colorScheme === 'dark' ? '#ffffff' : '#000000')
  );
  
  root.style.setProperty(
    '--tg-theme-hint-color',
    theme.hint_color || (colorScheme === 'dark' ? '#707579' : '#999999')
  );
  
  root.style.setProperty(
    '--tg-theme-link-color',
    theme.link_color || (colorScheme === 'dark' ? '#6ab7ff' : '#3390ec')
  );
  
  root.style.setProperty(
    '--tg-theme-button-color',
    theme.button_color || '#3390ec'
  );
  
  root.style.setProperty(
    '--tg-theme-button-text-color',
    theme.button_text_color || '#ffffff'
  );
  
  root.style.setProperty(
    '--tg-theme-secondary-bg-color',
    theme.secondary_bg_color || (colorScheme === 'dark' ? '#181818' : '#f1f1f1')
  );

  // Дополнительные цвета для тёмной темы
  if (colorScheme === 'dark') {
    root.style.setProperty('--tg-theme-destructive-text-color', '#ff6b6b');
    root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color || '#181818');
    root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color || '#ffffff');
    root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color || '#707579');
  } else {
    root.style.setProperty('--tg-theme-destructive-text-color', '#ff3b30');
    root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color || '#000000');
    root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color || '#999999');
  }

  // Устанавливаем цвет фона body
  document.body.style.backgroundColor = theme.bg_color || (colorScheme === 'dark' ? '#212121' : '#ffffff');
  document.body.style.color = theme.text_color || (colorScheme === 'dark' ? '#ffffff' : '#000000');

  // Устанавливаем headerColor и backgroundColor для Telegram
  if (theme.bg_color) {
    if (typeof webApp.setHeaderColor === 'function') {
      webApp.setHeaderColor(theme.bg_color);
    }
    if (typeof webApp.setBackgroundColor === 'function') {
      webApp.setBackgroundColor(theme.bg_color);
    }
  }
};

const applySystemTheme = () => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const root = document.documentElement;

  if (isDark) {
    root.style.setProperty('--tg-theme-bg-color', '#212121');
    root.style.setProperty('--tg-theme-text-color', '#ffffff');
    root.style.setProperty('--tg-theme-hint-color', '#707579');
    root.style.setProperty('--tg-theme-button-color', '#3390ec');
    root.style.setProperty('--tg-theme-button-text-color', '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', '#181818');
    root.style.setProperty('--tg-theme-destructive-text-color', '#ff6b6b');
    document.body.style.backgroundColor = '#212121';
    document.body.style.color = '#ffffff';
  } else {
    root.style.setProperty('--tg-theme-bg-color', '#ffffff');
    root.style.setProperty('--tg-theme-text-color', '#000000');
    root.style.setProperty('--tg-theme-hint-color', '#999999');
    root.style.setProperty('--tg-theme-button-color', '#3390ec');
    root.style.setProperty('--tg-theme-button-text-color', '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', '#f1f1f1');
    root.style.setProperty('--tg-theme-destructive-text-color', '#ff3b30');
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#000000';
  }
};

// Слушатель изменений темы (если Telegram поддерживает)
export const setupThemeListener = () => {
  const webApp = getTelegramWebApp();
  
  if (webApp) {
    // Применяем тему при изменении
    const handleThemeChange = () => {
      applyTelegramTheme();
    };

    // Применяем тему сразу
    applyTelegramTheme();

    // Если Telegram поддерживает события изменения темы, подписываемся
    // В текущей версии SDK это может не поддерживаться, но оставляем для будущего
    if (typeof webApp.onEvent === 'function') {
      webApp.onEvent('themeChanged', handleThemeChange);
    }

    // Также слушаем системные изменения темы (для fallback)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (!webApp) {
        applySystemTheme();
      }
    });
  } else {
    // Если не в Telegram, используем системную тему
    applySystemTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applySystemTheme);
  }
};
