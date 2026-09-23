import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ReminderForm } from './components/ReminderForm';
import { ReminderList } from './components/ReminderList';
import { Settings, type AccentColor } from './components/Settings';
import { CalendarView } from './components/CalendarView';
import { Friends } from './components/Friends';
import { BottomNav, type TabType } from './components/BottomNav';
import { StudioHub } from './components/StudioHub';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIReminderInput } from './components/AIReminderInput';
import { AIConfirmSheet } from './components/AIConfirmSheet';
import { initTelegramWebApp, getTelegramWebApp } from './utils/telegram';
import { setupThemeListener } from './utils/theme';
import { saveReminder, getReminders, deleteReminder, updateReminder, subscribeToReminders, createReminder } from './utils/reminder';
import { fetchUserSettings, saveUserSettings, type NotificationConfig } from './utils/settingsAPI';
import { startReminderScheduler, stopReminderScheduler } from './utils/reminderScheduler';
import type { ReminderFormData, Reminder } from './types/reminder';
import { fetchContactsAPI, getCachedContacts, type BotContact } from './utils/reminderStorage';
import type { AIReminderIntent } from './utils/aiParser';
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
  const webApp = getTelegramWebApp();
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const startParam = webApp?.initDataUnsafe?.start_param || urlParams?.get('start') || urlParams?.get('tab') || '';
  const isDirectStudio = startParam === 'studio' || startParam === 'editor' || urlParams?.get('tab') === 'studio';

  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(() => !isDirectStudio);
  const [activeTab, setActiveTab] = useState<TabType>(() => isDirectStudio ? 'studio' : 'inbox');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const user = webApp?.initDataUnsafe?.user;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [preselectedFriend, setPreselectedFriend] = useState<BotContact | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [notionToken, setNotionToken] = useState<string | undefined>();
  const [notionDatabaseId, setNotionDatabaseId] = useState<string | undefined>();
  const [totalCreated, setTotalCreated] = useState<number>(0);
  const [totalDeleted, setTotalDeleted] = useState<number>(0);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig | null>(null);
  const [showProfileActivity, setShowProfileActivity] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isInStudioEditor, setIsInStudioEditor] = useState<boolean>(false);
  const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');
  const [aiIntent, setAiIntent] = useState<AIReminderIntent | null>(null);
  const [contacts, setContacts] = useState<BotContact[]>(() => user?.id ? getCachedContacts(user.id) : []);

  const t = translations[language];

  useEffect(() => {
    if (user?.id) {
      const cached = getCachedContacts(user.id);
      if (cached.length > 0) setContacts(cached);
      fetchContactsAPI(user.id).then(data => {
        if (Array.isArray(data) && data.length > 0) setContacts(data);
      }).catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    initTelegramWebApp();
    setupThemeListener();
    
    // Load initial reminders
    const loadReminders = async () => {
      const data = await getReminders();
      setReminders(data);
    };
    loadReminders();

    // Load Notion and user settings
    const loadSettings = async () => {
      const settings = await fetchUserSettings();
      if (settings.notionToken) setNotionToken(settings.notionToken);
      if (settings.notionDatabaseId) setNotionDatabaseId(settings.notionDatabaseId);
      if (settings.totalCreated !== undefined) setTotalCreated(settings.totalCreated);
      if (settings.totalDeleted !== undefined) setTotalDeleted(settings.totalDeleted);
      if (settings.notificationConfig !== undefined) setNotificationConfig(settings.notificationConfig);
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
      if (data.recipients && data.recipients.length > 0) {
        const batchGroupId = data.recipients.length > 1
          ? 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
          : undefined;

        // Create one reminder per recipient with shared groupId
        for (const recipient of data.recipients) {
          const isSelf = recipient.chatId === user?.id;
          const newReminder = createReminder(
            {
              ...data,
              // If "myself" selected — no assignedTo (regular self-reminder)
              assignedTo: isSelf ? '' : recipient.username,
              assignedToChatId: isSelf ? undefined : recipient.chatId,
              creatorName: isSelf ? undefined : data.creatorName,
              groupId: batchGroupId,
            },
            user?.id
          );
          await saveReminder(newReminder);
        }
      } else {
        const newReminder = createReminder(data, user?.id);
        await saveReminder(newReminder);
      }
      setTotalCreated(prev => prev + (data.recipients?.length || 1));
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
      case 'studio': return 'Studio';
      case 'activity': return 'Activity';
      case 'create': return editingReminder ? 'Edit Reminder' : createMode === 'ai' ? 'AI Assistant' : 'Create Reminder';
      case 'friends': return 'Friends';
      case 'settings': return showProfileActivity ? 'Profile Activity' : 'Settings';
    }
  };

  const TAB_ORDER: TabType[] = ['inbox', 'studio', 'create', 'friends', 'settings'];
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isTouchIgnored = useRef<boolean>(false);

  const switchTab = (tab: TabType) => {
    setShowProfileActivity(false);
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

    const target = e.target as HTMLElement | null;
    if (
      target?.closest?.(
        '[data-no-swipe], .toolbar-scroll-track, .docs-formatting-toolbar, .editor-sticky-toolbar-island, .telegram-post-editor-page, .tiptap-content-wrapper, .tiptap, input, textarea, select'
      )
    ) {
      isTouchIgnored.current = true;
    } else {
      isTouchIgnored.current = false;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isTouchIgnored.current) {
      return;
    }

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
    <div className={`app theme-${accentColor} ${isInStudioEditor ? 'in-editor-mode' : ''}`}>
      {!isInStudioEditor && (
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
      )}

      <div
        className="app-content"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showWelcomeScreen ? (
          <ErrorBoundary name="WelcomeScreen">
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
                setShowProfileActivity(true);
                setActiveTab('settings');
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
              onModalOpenChange={setIsModalOpen}
            />
          </ErrorBoundary>
        ) : (
          <>
            {activeTab === 'inbox' && (
              <ErrorBoundary name="ReminderList">
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
                onModalOpenChange={setIsModalOpen}
              />
              </ErrorBoundary>
            )}


            {activeTab === 'studio' && (
              <StudioHub
                accentColor={accentColor}
                onEditorActiveChange={setIsInStudioEditor}
                userId={user?.id}
              />
            )}

            {activeTab === 'create' && (
              <div ref={formRef} className="create-tab-page animate-fade-in">
                {!editingReminder && (
                  <div className="form-mode-switch" style={{ margin: '0 0 16px 0' }}>
                    <button
                      type="button"
                      className={`mode-switch-btn ${createMode === 'manual' ? 'active' : ''}`}
                      onClick={() => {
                        try { webApp?.HapticFeedback?.selectionChanged?.(); } catch {}
                        setCreateMode('manual');
                      }}
                    >
                      {createMode === 'manual' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="mode-switch-active-pill"
                        />
                      )}
                      <span className="mode-btn-content">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        <span>Reminder</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`mode-switch-btn ${createMode === 'ai' ? 'active' : ''}`}
                      onClick={() => {
                        try { webApp?.HapticFeedback?.selectionChanged?.(); } catch {}
                        setCreateMode('ai');
                      }}
                    >
                      {createMode === 'ai' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="mode-switch-active-pill"
                        />
                      )}
                      <span className="mode-btn-content">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a10 10 0 1 0 10 10" />
                          <path d="M12 8v4l3 3" />
                          <circle cx="19" cy="5" r="3" fill="currentColor" stroke="none" />
                        </svg>
                        <span>AI Assistant</span>
                      </span>
                    </button>
                  </div>
                )}

                {createMode === 'manual' || editingReminder ? (
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
                ) : (
                  <AIReminderInput
                    userId={user?.id}
                    onResult={(intent) => {
                      try { webApp?.HapticFeedback?.notificationOccurred?.('success'); } catch {}
                      setAiIntent(intent);
                    }}
                  />
                )}

                {/* AI Confirmation Bottom Sheet */}
                <AIConfirmSheet
                  intent={aiIntent}
                  contacts={contacts}
                  currentUserId={user?.id}
                  onConfirm={async (remindersList) => {
                    setAiIntent(null);
                    for (const rData of remindersList) {
                      await handleSave(rData);
                    }
                  }}
                  onEdit={(prefilled) => {
                    setAiIntent(null);
                    setCreateMode('manual');
                    setEditingReminder({
                      id: 'temp_ai_' + Date.now(),
                      text: prefilled.text,
                      date: prefilled.date,
                      time: `${prefilled.hours}:${prefilled.minutes}`,
                      createdAt: Date.now(),
                      priority: prefilled.priority,
                      repeat: prefilled.repeat,
                      assignedTo: prefilled.assignedTo,
                      assignedToChatId: prefilled.assignedToChatId,
                      creatorName: prefilled.creatorName,
                    });
                  }}
                  onClose={() => setAiIntent(null)}
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
              showProfileActivity ? (
                <div className="animate-fade-in">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px 12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }} onClick={() => setShowProfileActivity(false)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--tg-theme-text-color, #000)' }}>Back to Settings</span>
                  </div>
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
                </div>
              ) : (
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
                  notificationConfig={notificationConfig}
                  onSaveNotificationConfig={async (newConfig) => {
                    const ok = await saveUserSettings({ notificationConfig: newConfig });
                    if (ok) {
                      setNotificationConfig(newConfig);
                    }
                    return ok;
                  }}
                  onResetNotificationConfig={async () => {
                    const ok = await saveUserSettings({ notificationConfig: null });
                    if (ok) {
                      setNotificationConfig(null);
                    }
                    return ok;
                  }}
                  onOpenActivity={() => setShowProfileActivity(true)}
                />
              )
            )}
          </>
        )}
      </div>

      {!isInStudioEditor && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={switchTab}
          isKeyboardVisible={isKeyboardVisible}
          isModalOpen={isModalOpen}
        />
      )}

    </div>
  );
}

export default App;
