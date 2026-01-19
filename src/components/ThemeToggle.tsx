import { useState, useEffect } from 'react';
import { getTelegramWebApp } from '../utils/telegram';
import './ThemeToggle.css';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (webApp) {
      setIsDark(webApp.colorScheme === 'dark');
    } else {
      // Проверяем системную тему
      const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkSystem);
    }
  }, []);

  const toggleTheme = () => {
    const webApp = getTelegramWebApp();
    const root = document.documentElement;
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      // Применяем тёмную тему
      root.style.setProperty('--tg-theme-bg-color', '#212121');
      root.style.setProperty('--tg-theme-text-color', '#ffffff');
      root.style.setProperty('--tg-theme-hint-color', '#707579');
      root.style.setProperty('--tg-theme-button-color', '#3390ec');
      root.style.setProperty('--tg-theme-button-text-color', '#ffffff');
      root.style.setProperty('--tg-theme-secondary-bg-color', '#181818');
      root.style.setProperty('--tg-theme-destructive-text-color', '#ff6b6b');
      root.style.setProperty('--tg-theme-link-color', '#6ab7ff');
      document.body.style.backgroundColor = '#212121';
      document.body.style.color = '#ffffff';
      
      if (webApp && typeof webApp.setHeaderColor === 'function') {
        webApp.setHeaderColor('#212121');
        webApp.setBackgroundColor('#212121');
      }
    } else {
      // Применяем светлую тему
      root.style.setProperty('--tg-theme-bg-color', '#ffffff');
      root.style.setProperty('--tg-theme-text-color', '#000000');
      root.style.setProperty('--tg-theme-hint-color', '#999999');
      root.style.setProperty('--tg-theme-button-color', '#3390ec');
      root.style.setProperty('--tg-theme-button-text-color', '#ffffff');
      root.style.setProperty('--tg-theme-secondary-bg-color', '#f1f1f1');
      root.style.setProperty('--tg-theme-destructive-text-color', '#ff3b30');
      root.style.setProperty('--tg-theme-link-color', '#3390ec');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
      
      if (webApp && typeof webApp.setHeaderColor === 'function') {
        webApp.setHeaderColor('#ffffff');
        webApp.setBackgroundColor('#ffffff');
      }
    }
  };

  return (
    <button 
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
};
