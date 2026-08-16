import { useState, useEffect, useRef } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ReminderForm } from './components/ReminderForm';
import { ReminderList } from './components/ReminderList';
import { Settings, type AccentColor } from './components/Settings';
import { CalendarView } from './components/CalendarView';
import { Friends } from './components/Friends';
import { BottomNav, type TabType } from './components/BottomNav';
import { initTelegramWebApp, getTelegramWebApp } from './utils/telegram';
import { setupThemeListener } from './utils/theme';
import { saveReminder, getReminders, deleteReminder, updateReminder, subscribeToReminders, createReminder } from './utils/reminder';
import { fetchUserSettings, saveUserSettings } from './utils/settingsAPI';
import { startReminderScheduler, stopReminderScheduler } from './utils/reminderScheduler';
import type { ReminderFormData, Reminder } from './types/reminder';
import type { BotContact } from './utils/reminderStorage';
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
    accentColor: 'toxic-yellow',
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
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const webApp = getTelegramWebApp();
  const user = webApp?.initDataUnsafe?.user;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [preselectedFriend, setPreselectedFriend] = useState<BotContact | null>(null);
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
      setShowWelcomeScreen(false);
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
      setShowWelcomeScreen(false);
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
    setShowWelcomeScreen(false);
    setActiveTab('create');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingReminder(null);
  };

  const handleClearPassed = async () => {
    const completedList = reminders.filter(r => r.done || r.status === 'done');
    for (const reminder of completedList) {
      try {
        await deleteReminder(reminder.id);
      } catch (error) {
        console.error('Error deleting completed reminder:', error);
      }
    }
    setReminders(prev => prev.filter(r => !r.done && r.status !== 'done'));
    setTotalDeleted(prev => prev + completedList.length);
  };

  const getPageTitle = () => {
    if (showWelcomeScreen) return 'Remigram';
    switch (activeTab) {
      case 'inbox': return 'Inbox';
      case 'activity': return 'Activity';
      case 'create': return editingReminder ? 'Edit Reminder' : 'Create Reminder';
      case 'friends': return 'Friends';
      case 'settings': return 'Settings';
    }
  };

  const TAB_ORDER: TabType[] = ['inbox', 'activity', 'create', 'friends', 'settings'];
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const switchTab = (tab: TabType) => {
    if (showWelcomeScreen) {
      setShowWelcomeScreen(false);
    } else if (tab === activeTab) {
      return;
    }

    try {
      webApp?.HapticFeedback?.selectionChanged?.();
    } catch {
      // ignore
    }
    if (tab === 'create') {
      setEditingReminder(null);
    }
    setActiveTab(tab);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Trigger when horizontal swipe is dominant and > 50px
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (showWelcomeScreen) {
        if (deltaX < 0) {
          setShowWelcomeScreen(false);
          setActiveTab('inbox');
        }
        return;
      }
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (deltaX < 0 && currentIndex < TAB_ORDER.length - 1) {
        switchTab(TAB_ORDER[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        switchTab(TAB_ORDER[currentIndex - 1]);
      }
    }
  };

  return (
    <div className={`app theme-${accentColor}`}>
      <div className="app-header">
        <div className="header-content">
          <h1>{getPageTitle()}</h1>
          {!showWelcomeScreen && activeTab === 'create' && editingReminder && (
            <button className="header-action-btn" onClick={handleCancelEdit} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
      </div>

      <div
        className="app-content"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showWelcomeScreen ? (
          <WelcomeScreen
            reminders={reminders}
            user={user}
            accentColor={accentColor}
            monochromePriority={monochromePriority}
            onNavigateToInbox={() => {
              setShowWelcomeScreen(false);
              setActiveTab('inbox');
            }}
            onNavigateToCreate={() => {
              setShowWelcomeScreen(false);
              setEditingReminder(null);
              setActiveTab('create');
            }}
            onNavigateToActivity={() => {
              setShowWelcomeScreen(false);
              setActiveTab('activity');
            }}
            onEdit={(r) => {
              setShowWelcomeScreen(false);
              handleEdit(r);
            }}
            onDelete={handleDelete}
            onStatusChange={async (id, status) => {
              const done = status === 'done';
              await updateReminder(id, { status, done });
              setReminders(prev => prev.map(r => r.id === id ? { ...r, status, done } as Reminder : r));
            }}
          />
        ) : (
          <>
            {activeTab === 'inbox' && (
              <ReminderList
                reminders={reminders}
                user={user}
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
            )}

            {activeTab === 'activity' && (
              <CalendarView
                reminders={reminders}
                accentColor={accentColor}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={async (id, status) => {
                  const done = status === 'done';
                  await updateReminder(id, { status, done });
                  setReminders(prev => prev.map(r => r.id === id ? { ...r, status, done } as Reminder : r));
                }}
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

            {activeTab === 'create' && (
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
                  preselectedFriend={preselectedFriend}
                  onClearPreselectedFriend={() => setPreselectedFriend(null)}
                />
              </div>
            )}

            {activeTab === 'friends' && (
              <Friends
                userId={user?.id}
                onRemindFriend={(contact) => {
                  setPreselectedFriend(contact);
                  setEditingReminder(null);
                  setShowWelcomeScreen(false);
                  setActiveTab('create');
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
                userName={user?.first_name}
                userUsername={user?.username}
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
          </>
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={switchTab}
        isKeyboardVisible={isKeyboardVisible}
      />
    </div>
  );
}

export default App;
