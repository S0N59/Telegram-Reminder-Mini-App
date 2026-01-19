import { useState, useEffect } from 'react';
import { ReminderForm } from './components/ReminderForm';
import { ReminderList } from './components/ReminderList';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { initTelegramWebApp, getUserData } from './utils/telegram';
import { setupThemeListener } from './utils/theme';
import { saveReminder, getReminders, deleteReminder, subscribeToReminders } from './utils/reminder';
import { startReminderScheduler, stopReminderScheduler } from './utils/reminderScheduler';
import type { ReminderFormData, Reminder } from './types/reminder';
import { translations, type Language } from './i18n';
import './App.css';

function App() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  useEffect(() => {
    // Инициализация Telegram WebApp
    initTelegramWebApp();
    
    // Настройка и применение темы Telegram
    setupThemeListener();

    // Загрузка напоминаний из localStorage
    loadReminders();
    
    // Подписка на изменения в реальном времени
    const user = getUserData();
    if (user?.id) {
      const unsubscribe = subscribeToReminders(user.id, (updatedReminders) => {
        setReminders(updatedReminders);
      });
      
      // Запуск планировщика напоминаний (работает только когда мини-приложение открыто)
      startReminderScheduler();
      
      return () => {
        unsubscribe();
        stopReminderScheduler();
      };
    }
  }, []);

  const loadReminders = async () => {
    const user = getUserData();
    if (user?.id) {
      const loaded = await getReminders();
      // Фильтруем только напоминания текущего пользователя и активные
      const userReminders = loaded.filter(r => r.userId === user.id && !r.done);
      setReminders(userReminders);
    }
  };

  const handleSave = async (formData: ReminderFormData) => {
    const user = getUserData();
    if (!user?.id) return;

    try {
      // Создание нового напоминания
      // Reminder is AUTOMATICALLY ACTIVE - notifications will work automatically!
      await saveReminder({
        id: Date.now().toString(),
        text: formData.text.trim(),
        date: formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`,
        time: `${formData.hours.padStart(2, '0')}:${formData.minutes.padStart(2, '0')}`,
        createdAt: Date.now(),
        userId: user.id,
        priority: formData.priority || 'MEDIUM',
        repeat: formData.repeat || 'NONE',
        customWeekdays: formData.customWeekdays,
        done: false, // Always false - reminder is ACTIVE and will send notifications automatically
        resendCount: 0,
        maxResend: 3
      });
      
      // Обновление списка произойдет автоматически через подписку
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Failed to save reminder. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder(id);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Failed to delete reminder. Please try again.');
    }
  };


  return (
    <div className="app">
      <div className="app-header">
        <LanguageToggle
          language={language}
          onToggle={setLanguage}
          ariaLabel={t.languageButtonAria}
        />
        <h1>🔔 {t.appTitle}</h1>
        <ThemeToggle />
      </div>
      
      <div className="app-content">
        <ReminderForm 
          onSave={handleSave} 
          strings={t} 
        />
        <ReminderList 
          reminders={reminders} 
          onDelete={handleDelete} 
          language={language} 
          strings={t} 
        />
      </div>
    </div>
  );
}

export default App;
