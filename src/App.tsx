import { useState, useEffect, useRef } from 'react';
import { ReminderForm } from './components/ReminderForm';
import { ReminderList } from './components/ReminderList';
import { Settings, type AccentColor } from './components/Settings';
import { initTelegramWebApp, getUserData } from './utils/telegram';
import { setupThemeListener } from './utils/theme';
import { saveReminder, getReminders, deleteReminder, updateReminder, subscribeToReminders } from './utils/reminder';
import { startReminderScheduler, stopReminderScheduler } from './utils/reminderScheduler';
import type { ReminderFormData, Reminder } from './types/reminder';
import { translations, type Language } from './i18n';
import './App.css';

// Accent color values
const accentColorValues: Record<AccentColor, { main: string; light: string }> = {
  blue: { main: '#3390ec', light: 'rgba(51, 144, 236, 0.1)' },
  red: { main: '#ff3b30', light: 'rgba(255, 59, 48, 0.1)' },
  yellow: { main: '#ffcc00', light: 'rgba(255, 204, 0, 0.15)' },
  green: { main: '#34c759', light: 'rgba(52, 199, 89, 0.1)' },
  purple: { main: '#af52de', light: 'rgba(175, 82, 222, 0.1)' },
};

// Load saved settings from localStorage
const loadSavedSettings = () => {
  const savedLanguage = localStorage.getItem('reminder_app_language') as Language;
  const savedAccentColor = localStorage.getItem('reminder_app_accent') as AccentColor;
  
  return {
    language: savedLanguage || 'en',
    accentColor: savedAccentColor || 'blue'
  };
};

function App() {
  const savedSettings = loadSavedSettings();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [language, setLanguage] = useState<Language>(savedSettings.language);
  const [accentColor, setAccentColor] = useState<AccentColor>(savedSettings.accentColor);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  // Apply accent color and save to localStorage
  useEffect(() => {
    const colors = accentColorValues[accentColor];
    document.documentElement.style.setProperty('--accent-color', colors.main);
    document.documentElement.style.setProperty('--accent-color-light', colors.light);
    document.documentElement.style.setProperty('--tg-theme-button-color', colors.main);
    localStorage.setItem('reminder_app_accent', accentColor);
  }, [accentColor]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('reminder_app_language', language);
  }, [language]);

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
        done: false,
        resendCount: 0,
        maxResend: 3,
        confirmRequired: formData.confirmRequired || false,
        reRemindInterval: formData.reRemindInterval || 5,
        confirmed: false
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

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUpdate = async (id: string, formData: ReminderFormData) => {
    try {
      await updateReminder(id, {
        text: formData.text.trim(),
        date: formData.date || `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`,
        time: `${formData.hours.padStart(2, '0')}:${formData.minutes.padStart(2, '0')}`,
        priority: formData.priority,
        repeat: formData.repeat,
        customWeekdays: formData.customWeekdays,
      });
      setEditingReminder(null);
    } catch (error) {
      console.error('Error updating reminder:', error);
      alert('Failed to update reminder. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingReminder(null);
  };

  const handleClearPassed = async () => {
    const now = new Date().getTime();
    const passedReminders = reminders.filter(r => {
      const reminderTime = new Date(r.date + 'T' + r.time + ':00').getTime();
      return reminderTime <= now && !r.done;
    });
    
    // Delete all passed reminders
    for (const reminder of passedReminders) {
      try {
        await deleteReminder(reminder.id);
      } catch (error) {
        console.error('Error deleting reminder:', error);
      }
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>🔔 {t.appTitle}</h1>
        <Settings
          language={language}
          onLanguageChange={setLanguage}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
          strings={t}
        />
      </div>
      
      <div className="app-content">
        <div ref={formRef}>
          <ReminderForm 
            onSave={handleSave}
            onUpdate={handleUpdate}
            onCancelEdit={handleCancelEdit}
            editingReminder={editingReminder}
            strings={t} 
          />
        </div>
        <ReminderList 
          reminders={reminders} 
          onDelete={handleDelete}
          onEdit={handleEdit}
          onClearPassed={handleClearPassed}
          language={language} 
          strings={t} 
        />
      </div>
    </div>
  );
}

export default App;
