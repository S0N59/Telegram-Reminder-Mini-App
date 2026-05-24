import { useState, useEffect, useRef } from 'react';
import { ReminderForm } from './components/ReminderForm';
import { ReminderList } from './components/ReminderList';
import { Settings, type AccentColor } from './components/Settings';
import { CalendarView } from './components/CalendarView';
import { initTelegramWebApp, getTelegramWebApp } from './utils/telegram';
import { setupThemeListener } from './utils/theme';
import { saveReminder, getReminders, deleteReminder, updateReminder, subscribeToReminders, createReminder } from './utils/reminder';
import { fetchUserSettings, saveUserSettings } from './utils/settingsAPI';
import { startReminderScheduler, stopReminderScheduler } from './utils/reminderScheduler';
import type { ReminderFormData, Reminder } from './types/reminder';
import { translations, type Language } from './i18n';
import './App.css';

// Accent color values
const accentColorValues: Record<AccentColor, { main: string; light: string; text: string }> = {
  blue: { main: '#3390ec', light: 'rgba(51, 144, 236, 0.1)', text: '#ffffff' },
  red: { main: '#ff3b30', light: 'rgba(255, 59, 48, 0.1)', text: '#ffffff' },
  yellow: { main: '#ffcc00', light: 'rgba(255, 204, 0, 0.15)', text: '#000000' },
  green: { main: '#34c759', light: 'rgba(52, 199, 89, 0.1)', text: '#ffffff' },
  purple: { main: '#af52de', light: 'rgba(175, 82, 222, 0.1)', text: '#ffffff' },
  orange: { main: '#ff9500', light: 'rgba(255, 149, 0, 0.1)', text: '#000000' },
  pink: { main: '#ff2d55', light: 'rgba(255, 45, 85, 0.1)', text: '#ffffff' },
  cyan: { main: '#5ac8fa', light: 'rgba(90, 200, 250, 0.1)', text: '#000000' },
  indigo: { main: '#5856d6', light: 'rgba(88, 86, 214, 0.1)', text: '#ffffff' },
  'toxic-yellow': { main: '#ccff00', light: 'rgba(204, 255, 0, 0.15)', text: '#000000' },
};

// Load saved settings from localStorage
const getSavedSettings = () => {
  const saved = localStorage.getItem('userSettings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing saved settings:', e);
    }
  }
  return {
    accentColor: 'blue',
    reRemindInterval: 10,
    reRemindEnabled: true,
    monochromePriority: false
  };
};

function App() {
  const savedSettings = getSavedSettings();
  const language: Language = 'en';
  const [accentColor, setAccentColor] = useState<AccentColor>(savedSettings.accentColor);
  const [reRemindInterval, setReRemindInterval] = useState<number>(savedSettings.reRemindInterval);
  const [reRemindEnabled, setReRemindEnabled] = useState<boolean>(savedSettings.reRemindEnabled ?? true);
  const [monochromePriority, setMonochromePriority] = useState<boolean>(savedSettings.monochromePriority);
  const [activeTab, setActiveTab] = useState<'reminders' | 'inbox' | 'settings' | 'calendar'>('reminders');
  const [previousTab, setPreviousTab] = useState<'reminders' | 'inbox' | 'settings' | 'calendar'>('reminders');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const webApp = getTelegramWebApp();
  const user = webApp?.initDataUnsafe?.user;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [notionToken, setNotionToken] = useState<string | undefined>();
  const [notionDatabaseId, setNotionDatabaseId] = useState<string | undefined>();
  const [totalCreated, setTotalCreated] = useState<number>(0);
  const [totalDeleted, setTotalDeleted] = useState<number>(0);

  const t = translations[language];

  useEffect(() => {
    initTelegramWebApp();
    setupThemeListener();
    
    // Load initial reminders
    const loadReminders = async () => {
      const data = await getReminders();
      setReminders(data);
    };
    loadReminders();

    // Load Notion settings
    const loadSettings = async () => {
      const settings = await fetchUserSettings();
      if (settings.notionToken) setNotionToken(settings.notionToken);
      if (settings.notionDatabaseId) setNotionDatabaseId(settings.notionDatabaseId);
      if (settings.totalCreated !== undefined) setTotalCreated(settings.totalCreated);
      if (settings.totalDeleted !== undefined) setTotalDeleted(settings.totalDeleted);
    };
    loadSettings();

    // Subscribe to reminder updates
    let unsubscribe: (() => void) | undefined;
    if (user?.id) {
      unsubscribe = subscribeToReminders(user.id, (updatedReminders: Reminder[]) => {
        setReminders(updatedReminders);
      });
    }

    // Start background scheduler
    startReminderScheduler();

    let initialHeight = window.innerHeight;
    const handleResize = () => {
      if (window.innerHeight > initialHeight) {
        initialHeight = window.innerHeight;
      }
      const isKeyboard = window.innerHeight < (initialHeight - 100);
      setIsKeyboardVisible(isKeyboard);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (unsubscribe) unsubscribe();
      stopReminderScheduler();
      window.removeEventListener('resize', handleResize);
    };
  }, [user?.id]);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify({
      accentColor,
      reRemindInterval,
      reRemindEnabled,
      monochromePriority
    }));

    const colors = accentColorValues[accentColor];
    document.documentElement.style.setProperty('--accent-color', colors.main);
    document.documentElement.style.setProperty('--accent-color-light', colors.light);
    document.documentElement.style.setProperty('--accent-text-color', colors.text);
  }, [accentColor, reRemindInterval, reRemindEnabled, monochromePriority]);

  const handleSave = async (data: ReminderFormData) => {
    try {
      const newReminder = createReminder(data, user?.id);
      await saveReminder(newReminder);
      setTotalCreated(prev => prev + 1);
      setActiveTab('inbox');
    } catch (error) {
      console.error('Error saving reminder:', error);
    }
  };

  const handleUpdate = async (id: string, formData: ReminderFormData) => {
    try {
      const time = `${formData.hours.padStart(2, '0')}:${formData.minutes.padStart(2, '0')}`;
      const updates = {
        ...formData,
        time
      };
      
      await updateReminder(id, updates);
      
      // Update local state immediately for better UX
      setReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates } as Reminder : r));
      
      setEditingReminder(null);
      setActiveTab('inbox');
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
      setTotalDeleted(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setActiveTab('reminders');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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

    for (const reminder of passedReminders) {
      try {
        await deleteReminder(reminder.id);
      } catch (error) {
        console.error('Error deleting reminder:', error);
      }
    }
    setReminders(prev => prev.filter(r => {
      const reminderTime = new Date(r.date + 'T' + r.time + ':00').getTime();
      return reminderTime > now || r.done;
    }));
  };

  return (
    <div className={`app theme-${accentColor}`}>
      <div className="app-header">
        <div className="header-content">
          <div className="user-profile">
            {(user as any)?.photo_url ? (
              <img src={(user as any).photo_url} alt="Avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar placeholder">
                {user?.first_name?.charAt(0) || 'U'}
              </div>
            )}
            <span className="user-name">{user?.first_name || 'User'}</span>
          </div>
          <h1>
            {activeTab === 'reminders' ? 'New Reminder' : 
             activeTab === 'inbox' ? 'Inbox' : 
             activeTab === 'calendar' ? 'Calendar' : 'Settings'}
          </h1>
          <div className="header-action">
            <button 
              className={`inbox-btn ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => {
                if (activeTab === 'inbox') {
                  setActiveTab(previousTab);
                } else {
                  setPreviousTab(activeTab);
                  setActiveTab('inbox');
                }
              }}
              aria-label="Inbox"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              {reminders.filter(r => !r.done).length > 0 && (
                <span className="inbox-badge">{reminders.filter(r => !r.done).length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="app-content">
        {activeTab === 'reminders' && (
          <div ref={formRef}>
            <ReminderForm
              onSave={handleSave}
              onUpdate={handleUpdate}
              onCancelEdit={handleCancelEdit}
              editingReminder={editingReminder}
              strings={t}
              globalReRemindInterval={reRemindInterval}
              globalReRemindEnabled={reRemindEnabled}
              monochromePriority={monochromePriority}
              userId={user?.id}
              creatorName={user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : undefined}
            />
          </div>
        )}
        
        {activeTab === 'inbox' && (
          <>
            <ReminderList
              reminders={reminders}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onClearPassed={handleClearPassed}
              language={language}
              strings={t}
              accentColor={accentColor}
              monochromePriority={monochromePriority}
              onStatusChange={async (id, status) => {
                const done = status === 'done';
                await updateReminder(id, { status, done });
                setReminders(prev => prev.map(r => r.id === id ? { ...r, status, done } as Reminder : r));
              }}
            />
          </>
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            reminders={reminders}
            accentColor={accentColor}
            onEdit={handleEdit}
            onDelete={handleDelete}
            monochromePriority={monochromePriority}
            strings={t}
            stats={{
              totalCreated,
              totalDeleted,
              inProgress: reminders.filter(r => r.status === 'in_progress' && !r.done).length,
              todo: reminders.filter(r => (r.status === 'todo' || !r.status) && !r.done).length,
              done: reminders.filter(r => r.done).length,
              overdue: reminders.filter(r => {
                if (r.done) return false;
                const reminderTime = new Date(r.date + 'T' + r.time + ':00').getTime();
                return reminderTime <= new Date().getTime();
              }).length
            }}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
            reRemindInterval={reRemindInterval}
            onReRemindIntervalChange={setReRemindInterval}
            reRemindEnabled={reRemindEnabled}
            onReRemindEnabledChange={setReRemindEnabled}
            monochromePriority={monochromePriority}
            onMonochromePriorityChange={setMonochromePriority}
            userId={user?.id}
            notionToken={notionToken}
            notionDatabaseId={notionDatabaseId}
            onSaveNotion={async (token, dbId) => {
              const ok = await saveUserSettings({ notionToken: token, notionDatabaseId: dbId });
              if (ok) {
                setNotionToken(token || undefined);
                setNotionDatabaseId(dbId || undefined);
              }
              return ok;
            }}
          />
        )}
      </div>

      {!isKeyboardVisible && (
        <nav className="bottom-nav">
          <button 
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Calendar</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'reminders' ? 'active' : ''}`}
            onClick={() => setActiveTab('reminders')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Create</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
