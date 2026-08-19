import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReminderFormData, Reminder, RepeatType, PriorityType } from '../types/reminder';
import { getTelegramWebApp } from '../utils/telegram';
import { fetchContactsAPI, addContactAPI, type BotContact } from '../utils/reminderStorage';
import { config } from '../config';
import { TimeWheelPicker } from './TimeWheelPicker';
import './ReminderForm.css';

const QUICK_TEMPLATES = [
  { icon: '💊', label: 'Take vitamins', text: 'Take vitamins & medicine' },
  { icon: '💧', label: 'Drink water', text: 'Drink a glass of water' },
  { icon: '📞', label: 'Call someone', text: 'Call ' },
  { icon: '🛒', label: 'Groceries', text: 'Buy groceries' },
  { icon: '🏃', label: 'Workout', text: 'Daily workout & stretch' },
  { icon: '💼', label: 'Meeting', text: 'Important meeting' },
];

interface ReminderFormProps {
  onSave: (reminder: ReminderFormData) => void;
  onUpdate?: (id: string, reminder: ReminderFormData) => void;
  onCancelEdit?: () => void;
  editingReminder?: Reminder | null;
  strings: {
    newReminderTitle: string;
    editReminderTitle: string;
    reminderTextLabel: string;
    reminderTextPlaceholder: string;
    dateLabel: string;
    yearLabel: string;
    monthLabel: string;
    dayLabel: string;
    timeLabel: string;
    hoursLabel: string;
    minutesLabel: string;
    createReminderButton: string;
    updateReminderButton: string;
    cancelEditButton: string;
    confirmRequiredLabel: string;
    confirmRequiredHint: string;
    invalidPastDate: string;
    monthsShort: string[];
  };
  globalReRemindInterval: number;
  globalReRemindEnabled: boolean;
  monochromePriority: boolean;
  userId?: number;
  creatorName?: string;
  preselectedFriend?: BotContact | null;
  onClearPreselectedFriend?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const ReminderForm = ({
  onSave,
  onUpdate,
  editingReminder,
  strings,
  globalReRemindInterval,
  globalReRemindEnabled,
  monochromePriority,
  userId,
  creatorName,
  preselectedFriend,
  onClearPreselectedFriend
}: ReminderFormProps) => {
  const getTodayDate = () => {
    const now = new Date();
    return {
      dateStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0'),
      hours: String(now.getHours()).padStart(2, '0'),
      minutes: String(now.getMinutes()).padStart(2, '0'),
    };
  };

  const today = getTodayDate();

  const getInitialFormData = (): ReminderFormData => ({
    text: '',
    date: today.dateStr,
    year: today.year,
    month: today.month,
    day: today.day,
    hours: today.hours,
    minutes: today.minutes,
    confirmRequired: globalReRemindEnabled,
    reRemindInterval: globalReRemindInterval,
    priority: 'MEDIUM',
    repeat: 'NONE',
    category: '',
    assignedTo: ''
  });

  const [formData, setFormData] = useState<ReminderFormData>(getInitialFormData());
  const [recipientMode, setRecipientMode] = useState<'me' | 'friend'>('me');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [contacts, setContacts] = useState<BotContact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<BotContact | null>(null);
  const [customFriendInput, setCustomFriendInput] = useState('');

  // Interactive Visual "When" Sub-tab: 'date' | 'time' | 'none'
  // Default 'none' so the panel is collapsed when form first opens
  const [whenView, setWhenView] = useState<'date' | 'time' | 'none'>('none');

  // Calendar View month & year
  const now = new Date();
  const [calViewYear, setCalViewYear] = useState<number>(parseInt(today.year, 10));
  const [calViewMonth, setCalViewMonth] = useState<number>(parseInt(today.month, 10) - 1); // 0-indexed

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const webApp = getTelegramWebApp();

  // Handle preselected friend from Friends tab
  useEffect(() => {
    if (preselectedFriend) {
      setRecipientMode('friend');
      setSelectedContact(preselectedFriend);
      const displayName = preselectedFriend.username
        ? `@${preselectedFriend.username}`
        : [preselectedFriend.firstName, preselectedFriend.lastName].filter(Boolean).join(' ') || 'Friend';
      setFormData(prev => ({
        ...prev,
        assignedTo: displayName,
        assignedToChatId: preselectedFriend.userId
      }));
      if (onClearPreselectedFriend) onClearPreselectedFriend();
    }
  }, [preselectedFriend, onClearPreselectedFriend]);

  useEffect(() => {
    if (editingReminder) {
      const [year, month, day] = editingReminder.date.split('-');
      const [hours, minutes] = editingReminder.time.split(':');
      setFormData({
        text: editingReminder.text,
        date: editingReminder.date,
        year,
        month,
        day,
        hours,
        minutes,
        priority: editingReminder.priority || 'MEDIUM',
        repeat: editingReminder.repeat || 'NONE',
        customWeekdays: editingReminder.customWeekdays,
        confirmRequired: editingReminder.confirmRequired || false,
        reRemindInterval: editingReminder.reRemindInterval || 5,
        category: editingReminder.category || '',
        assignedTo: editingReminder.assignedTo || '',
        assignedToChatId: editingReminder.assignedToChatId
      });
      if (year && month) {
        setCalViewYear(parseInt(year, 10));
        setCalViewMonth(parseInt(month, 10) - 1);
      }
      if (editingReminder.assignedTo || editingReminder.assignedToChatId) {
        setRecipientMode('friend');
      } else {
        setRecipientMode('me');
      }
    } else if (!preselectedFriend) {
      setFormData(getInitialFormData());
      setRecipientMode('me');
    }
  }, [editingReminder]);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const closeDropdowns = () => setOpenDropdown(null);

  useEffect(() => {
    const handleGlobalClick = () => closeDropdowns();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Calendar calculations
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(calViewYear, calViewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calViewMonth === 0) {
      setCalViewMonth(11);
      setCalViewYear(calViewYear - 1);
    } else {
      setCalViewMonth(calViewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calViewMonth === 11) {
      setCalViewMonth(0);
      setCalViewYear(calViewYear + 1);
    } else {
      setCalViewMonth(calViewMonth + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const yStr = calViewYear.toString();
    const mStr = String(calViewMonth + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    setFormData(prev => ({
      ...prev,
      year: yStr,
      month: mStr,
      day: dStr,
      date: `${yStr}-${mStr}-${dStr}`
    }));
  };

  const isSelectedDate = (dayNum: number) => {
    return (
      parseInt(formData.year, 10) === calViewYear &&
      parseInt(formData.month, 10) === (calViewMonth + 1) &&
      parseInt(formData.day, 10) === dayNum
    );
  };

  const isTodayDate = (dayNum: number) => {
    return (
      now.getFullYear() === calViewYear &&
      now.getMonth() === calViewMonth &&
      now.getDate() === dayNum
    );
  };

  const isPastDate = (dayNum: number) => {
    const check = new Date(calViewYear, calViewMonth, dayNum, 23, 59, 59);
    return check.getTime() < now.getTime() && !isTodayDate(dayNum);
  };

  // Time adjustments from TimeWheelPicker
  const handleHourChange = (hStr: string) => {
    setFormData(prev => ({ ...prev, hours: hStr }));
  };

  const handleMinuteChange = (mStr: string) => {
    setFormData(prev => ({ ...prev, minutes: mStr }));
  };

  const handleOpenContactPicker = useCallback(async () => {
    if (!contactsLoaded && userId) {
      const data = await fetchContactsAPI(userId);
      setContacts(data);
      setContactsLoaded(true);
    }
    setContactSearch('');
    setShowContactPicker(true);
  }, [contactsLoaded, userId]);

  const handleInviteFriend = useCallback(() => {
    if (!userId) return;
    const inviteLink = `https://t.me/${config.botUsername}?start=add_${userId}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Add me to your Reminder contacts on Remigram so we can send each other reminders!')}`;
    if (webApp) {
      webApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }, [userId, webApp]);

  const handleSelectContact = useCallback((contact: BotContact) => {
    setSelectedContact(contact);
    const displayName = contact.username
      ? `@${contact.username}`
      : [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Friend';
    setFormData(prev => ({
      ...prev,
      assignedTo: displayName,
      assignedToChatId: contact.userId
    }));
    setShowContactPicker(false);
  }, []);

  const handleApplyCustomFriend = useCallback(async () => {
    if (!customFriendInput.trim()) return;
    const cleanUsername = customFriendInput.trim().replace(/^@/, '');
    const formattedName = `@${cleanUsername}`;

    if (userId) {
      try {
        const addedContact = await addContactAPI(userId, cleanUsername);
        if (addedContact && addedContact.userId) {
          setSelectedContact(addedContact);
          setFormData(prev => ({
            ...prev,
            assignedTo: formattedName,
            assignedToChatId: addedContact.userId
          }));
          setShowContactPicker(false);
          setCustomFriendInput('');
          return;
        }
      } catch (err) {
        console.error('Error auto-adding contact:', err);
      }
    }

    setFormData(prev => ({
      ...prev,
      assignedTo: formattedName,
      assignedToChatId: undefined
    }));
    setSelectedContact(null);
    setShowContactPicker(false);
    setCustomFriendInput('');
  }, [customFriendInput, userId]);

  const handleClearContact = useCallback(() => {
    setSelectedContact(null);
    setFormData(prev => ({
      ...prev,
      assignedTo: '',
      assignedToChatId: undefined
    }));
  }, []);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(c =>
      (c.firstName?.toLowerCase().includes(q)) ||
      (c.lastName?.toLowerCase().includes(q)) ||
      (c.username?.toLowerCase().includes(q))
    );
  }, [contacts, contactSearch]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, text: e.target.value }));
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const isDateValid = (year: string, month: string, day: string): boolean => {
    if (!year || !month || !day) return true;
    const selectedDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= todayZero;
  };

  const handleSave = useCallback(() => {
    const dateStr = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;

    if (!isDateValid(formData.year, formData.month, formData.day)) {
      alert(strings.invalidPastDate);
      const curr = getTodayDate();
      setFormData(prev => ({ ...prev, year: curr.year, month: curr.month, day: curr.day }));
      return;
    }

    if (formData.text.trim() && formData.year && formData.month && formData.day && formData.hours && formData.minutes) {
      const reminderData = {
        ...formData,
        date: dateStr
      };

      if (recipientMode === 'me') {
        reminderData.assignedTo = '';
        reminderData.assignedToChatId = undefined;
      } else if (reminderData.assignedToChatId && creatorName) {
        (reminderData as any).creatorName = creatorName;
      }

      if (editingReminder && onUpdate) {
        onUpdate(editingReminder.id, reminderData);
      } else {
        onSave(reminderData);
      }

      setFormData(getInitialFormData());
      setSelectedContact(null);
    }
  }, [formData, onSave, onUpdate, editingReminder, creatorName, recipientMode, strings.invalidPastDate]);

  // Formatted date label
  const formattedDateLabel = useMemo(() => {
    const dateStr = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
    const curr = getTodayDate();
    if (dateStr === curr.dateStr) return 'Today';
    
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    const tomStr = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;
    if (dateStr === tomStr) return 'Tomorrow';

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [formData.year, formData.month, formData.day]);

  // Lock body scroll when contact modal is open
  useEffect(() => {
    if (showContactPicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showContactPicker]);

  const handleQuickPreset = (type: 'in1h' | 'tonight' | 'tomorrow' | 'weekend') => {
    try {
      webApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    const d = new Date();
    if (type === 'in1h') {
      d.setHours(d.getHours() + 1);
    } else if (type === 'tonight') {
      d.setHours(20, 0, 0, 0);
    } else if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (type === 'weekend') {
      const day = d.getDay();
      const diff = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(10, 0, 0, 0);
    }

    const year = d.getFullYear().toString();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    setFormData(prev => ({
      ...prev,
      date: `${year}-${month}-${day}`,
      year,
      month,
      day,
      hours,
      minutes,
    }));
  };

  const handleTemplateClick = (templateText: string) => {
    try {
      webApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    setFormData(prev => ({
      ...prev,
      text: templateText
    }));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="reminder-form-container animate-fade-in">
      {/* 1. Top Segmented Control: For me | For friend with Liquid Glass sliding pill */}
      <div className="form-mode-switch">
        <button
          type="button"
          className={`mode-switch-btn ${recipientMode === 'me' ? 'active' : ''}`}
          onClick={() => {
            try {
              webApp?.HapticFeedback?.selectionChanged?.();
            } catch {}
            setRecipientMode('me');
            handleClearContact();
          }}
        >
          {recipientMode === 'me' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="mode-switch-active-pill"
            />
          )}
          <span className="mode-btn-content">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>For me</span>
          </span>
        </button>
        <button
          type="button"
          className={`mode-switch-btn ${recipientMode === 'friend' ? 'active' : ''}`}
          onClick={() => {
            try {
              webApp?.HapticFeedback?.selectionChanged?.();
            } catch {}
            setRecipientMode('friend');
          }}
        >
          {recipientMode === 'friend' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="mode-switch-active-pill"
            />
          )}
          <span className="mode-btn-content">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>For friend</span>
          </span>
        </button>
      </div>

      <div className="form-card-group">
        {/* 2. Field: What */}
        <div className="form-card-row form-input-card">
          <label className="form-row-label">What do you want to remind?</label>
          <textarea
            ref={textareaRef}
            value={formData.text}
            onChange={handleTextChange}
            placeholder="e.g. Call doctor, buy groceries..."
            className="form-row-textarea"
            maxLength={200}
            rows={2}
          />
        </div>

        {/* 3. Field: Who (Only if For friend) */}
        {recipientMode === 'friend' && (
          <div className="form-card-row form-recipient-card" onClick={handleOpenContactPicker}>
            <label className="form-row-label">Recipient</label>
            <div className="form-row-interactive">
              {formData.assignedTo ? (
                <div className="selected-friend-chip">
                  <span>{formData.assignedTo}</span>
                </div>
              ) : (
                <span className="placeholder-text">Choose friend or type @username...</span>
              )}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="row-icon">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        )}

        {/* 4. Field: When Selector with Liquid Glass sliding pill */}
        <div className="form-card-row visual-when-card">
          <label className="form-row-label">When</label>

          <div className="when-top-switch">
            <button
              type="button"
              className={`when-toggle-btn ${whenView === 'date' ? 'active' : ''}`}
              onClick={() => {
                try { webApp?.HapticFeedback?.selectionChanged?.(); } catch {}
                setWhenView(whenView === 'date' ? 'none' : 'date');
              }}
            >
              {whenView === 'date' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="when-active-pill"
                />
              )}
              <span className="when-btn-content">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{formattedDateLabel}</span>
              </span>
            </button>

            <button
              type="button"
              className={`when-toggle-btn ${whenView === 'time' ? 'active' : ''}`}
              onClick={() => {
                try { webApp?.HapticFeedback?.selectionChanged?.(); } catch {}
                setWhenView(whenView === 'time' ? 'none' : 'time');
              }}
            >
              {whenView === 'time' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="when-active-pill"
                />
              )}
              <span className="when-btn-content">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{formData.hours}:{formData.minutes}</span>
              </span>
            </button>
          </div>

          {/* VISUAL DARK CALENDAR */}
          {whenView === 'date' && (
            <div className="visual-calendar-box animate-slide-down">
              <div className="cal-header-bar">
                <span className="cal-title-text">
                  {MONTH_NAMES[calViewMonth]} {calViewYear}
                </span>
                <div className="cal-nav-buttons">
                  <button type="button" className="cal-nav-arrow" onClick={handlePrevMonth} aria-label="Previous month">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button type="button" className="cal-nav-arrow" onClick={handleNextMonth} aria-label="Next month">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>

              <div className="cal-weekdays-row">
                {WEEK_DAYS.map(wd => (
                  <div key={wd} className="cal-weekday-label">{wd}</div>
                ))}
              </div>

              <div className="cal-days-grid">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="cal-day-item empty"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSel = isSelectedDate(dayNum);
                  const isTod = isTodayDate(dayNum);
                  const isPast = isPastDate(dayNum);
                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      className={`cal-day-item ${isSel ? 'selected' : ''} ${isTod ? 'today' : ''} ${isPast ? 'past' : ''}`}
                      onClick={() => handleSelectDay(dayNum)}
                      disabled={isPast}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Confirm Date Button */}
              <div className="picker-confirm-row">
                <button
                  type="button"
                  className="picker-confirm-btn"
                  onClick={() => {
                    try { webApp?.HapticFeedback?.notificationOccurred?.('success'); } catch {}
                    setWhenView('none');
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Done • {formattedDateLabel}</span>
                </button>
              </div>
            </div>
          )}

          {/* VISUAL TACTILE TIME DRUM */}
          {whenView === 'time' && (
            <div className="visual-time-box animate-slide-down">
              <TimeWheelPicker
                hours={formData.hours}
                minutes={formData.minutes}
                onHourChange={handleHourChange}
                onMinuteChange={handleMinuteChange}
                isToday={`${formData.year}-${formData.month}-${formData.day}` === today.dateStr}
              />

              {/* Confirm Time Button */}
              <div className="picker-confirm-row">
                <button
                  type="button"
                  className="picker-confirm-btn"
                  onClick={() => {
                    try { webApp?.HapticFeedback?.notificationOccurred?.('success'); } catch {}
                    setWhenView('none');
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Done • {formData.hours}:{formData.minutes}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. Field: Priority (Liquid Glass Segmented Bar with Sliding Bubble Pill) */}
        <div className="form-card-row priority-card-row">
          <label className="form-row-label">Priority</label>
          <div className="priority-segmented-bar">
            {(['LOW', 'MEDIUM', 'HIGH'] as PriorityType[]).map(p => {
              const isActive = formData.priority === p;
              const pClass = p.toLowerCase();
              return (
                <button
                  key={p}
                  type="button"
                  className={`priority-segment-btn ${pClass} ${isActive ? 'active' : ''} ${monochromePriority ? `mono-${pClass}` : ''}`}
                  onClick={() => {
                    try { webApp?.HapticFeedback?.selectionChanged?.(); } catch {}
                    setFormData(prev => ({ ...prev, priority: p }));
                  }}
                >
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="priority-active-pill"
                    />
                  )}
                  <span className="priority-btn-content">
                    <span className={`priority-dot ${pClass}`} />
                    <span>{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                    {isActive && (
                      <motion.svg
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="priority-check-icon"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </motion.svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Grouped Settings Rows: Repeat & Category */}
        <div className="form-card-row grouped-options-card">
          {/* Repeat */}
          <div className="form-sub-row">
            <div className="form-row-interactive" onClick={(e) => { e.stopPropagation(); toggleDropdown('repeat'); }}>
              <span className="form-row-label no-margin">Repeat</span>
              <div className="row-val-wrap">
                <span className="selected-contact-text">
                  {formData.repeat === 'NONE' ? 'Never' : formData.repeat.charAt(0) + formData.repeat.slice(1).toLowerCase()}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`row-icon ${openDropdown === 'repeat' ? 'rotated' : ''}`}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
            {openDropdown === 'repeat' && (
              <div className="dropdown-inline-menu animate-slide-down">
                {(['NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY'] as RepeatType[]).map(rep => (
                  <div
                    key={rep}
                    className={`menu-option ${formData.repeat === rep ? 'active' : ''}`}
                    onClick={() => {
                      setFormData(p => ({ ...p, repeat: rep }));
                      closeDropdowns();
                    }}
                  >
                    {rep === 'NONE' ? 'Never' : rep.charAt(0) + rep.slice(1).toLowerCase()}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-sub-divider" />

          {/* Category */}
          <div className="form-sub-row">
            <div className="form-row-interactive" onClick={(e) => { e.stopPropagation(); toggleDropdown('category'); }}>
              <span className="form-row-label no-margin">Category</span>
              <div className="row-val-wrap">
                <span className="selected-contact-text">{formData.category || 'None'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`row-icon ${openDropdown === 'category' ? 'rotated' : ''}`}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
            {openDropdown === 'category' && (
              <div className="dropdown-inline-menu animate-slide-down">
                <div className="menu-option" onClick={() => { setFormData(p => ({ ...p, category: '' })); closeDropdowns(); }}>None</div>
                {['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'].map(cat => (
                  <div
                    key={cat}
                    className={`menu-option ${formData.category === cat ? 'active' : ''}`}
                    onClick={() => { setFormData(p => ({ ...p, category: cat })); closeDropdowns(); }}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Action Button */}
      <div className="form-submit-container">
        <button
          type="button"
          className="create-reminder-neon-btn"
          onClick={handleSave}
          disabled={!formData.text.trim()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {editingReminder ? (
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            ) : (
              <>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </>
            )}
          </svg>
          <span>{editingReminder ? 'Update Reminder' : 'Create Reminder'}</span>
        </button>
      </div>

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <div className="contact-modal-overlay" onClick={() => setShowContactPicker(false)}>
          <div className="contact-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-drag-handle"></div>
            <div className="contact-modal-header">
              <div className="modal-header-title-group">
                <h3>Select Friend</h3>
                <span className="modal-header-subtitle">Choose from your contacts or enter username</span>
              </div>
              <button type="button" className="contact-modal-close" onClick={() => setShowContactPicker(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Custom Input for typing a username directly */}
            <div className="custom-user-input-row">
              <input
                type="text"
                className="custom-user-input"
                placeholder="Enter @username directly..."
                value={customFriendInput}
                onChange={(e) => setCustomFriendInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomFriend()}
              />
              <button
                type="button"
                className="custom-user-apply-btn"
                onClick={handleApplyCustomFriend}
                disabled={!customFriendInput.trim()}
              >
                Set
              </button>
            </div>

            <div className="contact-search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="contact-search"
                placeholder="Search connected friends..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>

            <button type="button" className="contact-invite-btn" onClick={handleInviteFriend}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Share Invite Link</span>
            </button>

            {/* Contact list with isolated scroll */}
            <div className="contact-list" onTouchMove={(e) => e.stopPropagation()}>
              {filteredContacts.length === 0 ? (
                <div className="contact-empty">
                  {contactsLoaded ? 'No connected friends found. Type an @username above or share your invite link!' : 'Loading friends...'}
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.userId}
                    className="contact-item"
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="contact-item-avatar">
                      <img
                        src={`${config.backendUrl}/api/avatar?userId=${contact.userId}`}
                        alt={contact.firstName || 'User'}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerText = (contact.firstName || 'U').charAt(0).toUpperCase();
                        }}
                      />
                    </div>
                    <div className="contact-item-info">
                      <span className="contact-item-name">{[contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Friend'}</span>
                      {contact.username && <span className="contact-item-username">@{contact.username}</span>}
                    </div>
                    <button type="button" className="contact-select-pill">
                      Select
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
