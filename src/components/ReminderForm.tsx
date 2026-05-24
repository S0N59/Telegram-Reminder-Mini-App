import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ReminderFormData, Reminder } from '../types/reminder';
import { getTelegramWebApp } from '../utils/telegram';
import { fetchContactsAPI, type BotContact } from '../utils/reminderStorage';
import { config } from '../config';
import './ReminderForm.css';

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
}

export const ReminderForm = ({ 
  onSave, 
  onUpdate, 
  onCancelEdit, 
  editingReminder, 
  strings, 
  globalReRemindInterval,
  globalReRemindEnabled,
  monochromePriority,
  userId,
  creatorName
}: ReminderFormProps) => {
  // Initialize with current date
  const getCurrentDate = () => {
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0'),
      hours: String(now.getHours()).padStart(2, '0'),
      minutes: String(now.getMinutes()).padStart(2, '0'),
    };
  };

  const currentDate = getCurrentDate();

  // Initialize form with current date
  const getInitialFormData = (): ReminderFormData => {
    return {
      text: '',
      date: '',
      year: currentDate.year,
      month: currentDate.month,
      day: currentDate.day,
      hours: currentDate.hours,
      minutes: currentDate.minutes,
      confirmRequired: globalReRemindEnabled,
      reRemindInterval: globalReRemindInterval,
      priority: 'MEDIUM',
      category: '',
      assignedTo: ''
    };
  };

  const [formData, setFormData] = useState<ReminderFormData>(getInitialFormData());


  // When editingReminder changes, populate the form
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
        priority: editingReminder.priority,
        repeat: editingReminder.repeat,
        customWeekdays: editingReminder.customWeekdays,
        confirmRequired: editingReminder.confirmRequired || false,
        reRemindInterval: editingReminder.reRemindInterval || 5,
        category: editingReminder.category || '',
        assignedTo: editingReminder.assignedTo || ''
      });
    } else {
      setFormData(getInitialFormData());
    }
  }, [editingReminder]);

  const webApp = getTelegramWebApp();

  // Custom Select state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Contact picker state
  const [contacts, setContacts] = useState<BotContact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<BotContact | null>(null);

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const closeDropdowns = () => setOpenDropdown(null);

  useEffect(() => {
    const handleGlobalClick = () => closeDropdowns();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Get available years
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());
  }, []);

  // Get available months based on selected year
  const months = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = now.getMonth() + 1;
    
    return Array.from({ length: 12 }, (_, i) => {
      const monthVal = String(i + 1).padStart(2, '0');
      return { value: monthVal, name: strings.monthsShort[i] };
    }).filter(m => {
      if (formData.year > currentYear) return true;
      return parseInt(m.value) >= currentMonth;
    });
  }, [formData.year, strings.monthsShort]);

  // Get available days based on selected year and month
  const days = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = now.getDate();
    
    const year = parseInt(formData.year);
    const month = parseInt(formData.month);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'))
      .filter(d => {
        if (formData.year > currentYear || formData.month > currentMonth) return true;
        return parseInt(d) >= currentDay;
      });
  }, [formData.year, formData.month]);

  // Get available hours based on selected date
  const hours = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const currentHour = now.getHours();

    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
      .filter(h => {
        if (formData.year > currentYear || formData.month > currentMonth || formData.day > currentDay) return true;
        return parseInt(h) >= currentHour;
      });
  }, [formData.year, formData.month, formData.day]);

  // Get available minutes based on selected date and hour
  const minutes = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = now.getMinutes();

    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
      .filter(m => {
        if (formData.year > currentYear || formData.month > currentMonth || formData.day > currentDay || formData.hours > currentHour) return true;
        return parseInt(m) > currentMinute; // Strictly future
      });
  }, [formData.year, formData.month, formData.day, formData.hours]);

  // Ensure selected values are still valid when options change
  useEffect(() => {
    if (!months.find(m => m.value === formData.month)) {
      setFormData(prev => ({ ...prev, month: months[0]?.value || '01' }));
    }
  }, [months]);

  useEffect(() => {
    if (!days.includes(formData.day)) {
      setFormData(prev => ({ ...prev, day: days[0] || '01' }));
    }
  }, [days]);

  useEffect(() => {
    if (!hours.includes(formData.hours)) {
      setFormData(prev => ({ ...prev, hours: hours[0] || '00' }));
    }
  }, [hours]);

  useEffect(() => {
    if (!minutes.includes(formData.minutes)) {
      setFormData(prev => ({ ...prev, minutes: minutes[0] || '00' }));
    }
  }, [minutes]);

  // Load contacts when picker is opened
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
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Add me to your Reminder contacts so we can send each other reminders!')}`;
    
    if (webApp) {
      webApp.openTelegramLink(shareUrl);
    } else {
      // Fallback for browser testing
      window.open(shareUrl, '_blank');
    }
  }, [userId, webApp]);

  const handleSelectContact = useCallback((contact: BotContact) => {
    setSelectedContact(contact);
    const displayName = contact.username ? `@${contact.username}` : (contact.firstName || 'User');
    setFormData(prev => ({
      ...prev,
      assignedTo: displayName,
      assignedToChatId: contact.userId
    }));
    setShowContactPicker(false);
  }, []);

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

  const handleSave = useCallback(() => {
    const dateStr = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;

    // Final validation: ensure date is not in the past
    if (!isDateValid(formData.year, formData.month, formData.day)) {
      alert(strings.invalidPastDate);
      const today = getCurrentDate();
      setFormData(prev => ({ ...prev, year: today.year, month: today.month, day: today.day }));
      return;
    }

    if (formData.text.trim() && formData.year && formData.month && formData.day && formData.hours && formData.minutes) {
      const reminderData = {
        ...formData,
        date: dateStr
      };

      // If sending to someone, attach creator name
      if (reminderData.assignedToChatId && creatorName) {
        (reminderData as any).creatorName = creatorName;
      }

      if (editingReminder && onUpdate) {
        // Update existing reminder
        onUpdate(editingReminder.id, reminderData);
      } else {
        // Create new reminder
        onSave(reminderData);
      }

      // Reset form but keep current date
      const today = getCurrentDate();
      setFormData({
        text: '',
        date: '',
        year: today.year,
        month: today.month,
        day: today.day,
        hours: today.hours,
        minutes: today.minutes,
        confirmRequired: false,
        reRemindInterval: globalReRemindInterval,
        priority: 'MEDIUM',
        category: '',
        assignedTo: ''
      });
      setSelectedContact(null);
    }
  }, [formData, onSave, onUpdate, editingReminder, globalReRemindInterval, creatorName]);

  const handleCancel = useCallback(() => {
    if (onCancelEdit) {
      onCancelEdit();
    }
    const today = getCurrentDate();
    setFormData({
      text: '',
      date: '',
      year: today.year,
      month: today.month,
      day: today.day,
      hours: today.hours,
      minutes: today.minutes,
      confirmRequired: false,
      reRemindInterval: globalReRemindInterval,
      priority: 'MEDIUM',
      category: '',
      assignedTo: ''
    });
  }, [onCancelEdit, globalReRemindInterval]);

  const isDateValid = (year: string, month: string, day: string): boolean => {
    if (!year || !month || !day) return true; // Allow empty during typing

    const selectedDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    return selectedDate >= today;
  };

  const handleYearChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, year: value };
      if (value && prev.month && prev.day && !isDateValid(value, prev.month, prev.day)) {
        const today = getCurrentDate();
        return { ...newData, year: today.year, month: today.month, day: today.day };
      }
      return newData;
    });
  };

  const handleMonthChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, month: value.padStart(2, '0') };
      if (prev.year && value && prev.day && !isDateValid(prev.year, value, prev.day)) {
        const today = getCurrentDate();
        return { ...newData, year: today.year, month: today.month, day: today.day };
      }
      return newData;
    });
  };

  const handleDayChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, day: value.padStart(2, '0') };
      if (prev.year && prev.month && value && !isDateValid(prev.year, prev.month, value)) {
        const today = getCurrentDate();
        return { ...newData, year: today.year, month: today.month, day: today.day };
      }
      return newData;
    });
  };

  // Скрываем MainButton, так как используем свою кнопку
  useEffect(() => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  }, [webApp]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, text: e.target.value }));
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleHoursChange = (e: ChangeEvent<HTMLSelectElement>) => {
    // Keep the value as-is from the select (already padded with leading zero)
    setFormData(prev => ({ ...prev, hours: e.target.value }));
  };

  const handleMinutesChange = (e: ChangeEvent<HTMLSelectElement>) => {
    // Keep the value as-is from the select (already padded with leading zero)
    setFormData(prev => ({ ...prev, minutes: e.target.value }));
  };


  return (
    <div className="reminder-form">
        
        <div className="form-group block-group">
          <label htmlFor="reminder-text" className="block-label">
            <span className="label-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </span>
            REMINDER TEXT
          </label>
          <textarea
            ref={textareaRef}
            id="reminder-text"
            value={formData.text}
            onChange={handleTextChange}
            placeholder={strings.reminderTextPlaceholder}
            className="form-input block-textarea"
            maxLength={200}
            rows={1}
          />
          <div className="char-counter">
            {formData.text.length}/200
          </div>
        </div>

        <div className="form-group block-group">
          <label className="block-label">
            <span className="label-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
            DATE (YYYY MM DD)
          </label>
          <div className="block-inputs date-blocks">
            <div className="block-item">
              <div className="custom-select-container">
                <button 
                  type="button"
                  className={`block-select ${openDropdown === 'year' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('year'); }}
                >
                  {formData.year}
                </button>
                {openDropdown === 'year' && (
                  <div className="custom-select-options">
                    {years.map(y => (
                      <div key={y} className="option" onClick={() => { handleYearChange(y); closeDropdowns(); }}>{y}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="block-sub-label">Year</div>
            </div>
            <div className="block-item">
              <div className="custom-select-container">
                <button 
                  type="button"
                  className={`block-select ${openDropdown === 'month' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('month'); }}
                >
                  {formData.month}
                </button>
                {openDropdown === 'month' && (
                  <div className="custom-select-options">
                    {months.map(m => (
                      <div key={m.value} className="option" onClick={() => { handleMonthChange(m.value); closeDropdowns(); }}>{m.value}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="block-sub-label">Month</div>
            </div>
            <div className="block-item">
              <div className="custom-select-container">
                <button 
                  type="button"
                  className={`block-select ${openDropdown === 'day' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('day'); }}
                >
                  {formData.day}
                </button>
                {openDropdown === 'day' && (
                  <div className="custom-select-options">
                    {days.map(d => (
                      <div 
                        key={d} 
                        className="option" 
                        onClick={() => { handleDayChange(d); closeDropdowns(); }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="block-sub-label">Day</div>
            </div>
          </div>
        </div>

        <div className="form-group block-group">
          <label className="block-label">
            <span className="label-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </span>
            TIME (HH MM)
          </label>
          <div className="block-inputs time-blocks">
            <div className="block-item">
              <div className="custom-select-container">
                <button 
                  type="button"
                  className={`block-select ${openDropdown === 'hours' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('hours'); }}
                >
                  {formData.hours}
                </button>
                {openDropdown === 'hours' && (
                  <div className="custom-select-options">
                    {hours.map(h => (
                      <div key={h} className="option" onClick={() => { handleHoursChange({ target: { value: h } } as any); closeDropdowns(); }}>{h}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="block-sub-label">Hours</div>
            </div>
            <div className="block-item">
              <div className="custom-select-container">
                <button 
                  type="button"
                  className={`block-select ${openDropdown === 'minutes' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleDropdown('minutes'); }}
                >
                  {formData.minutes}
                </button>
                {openDropdown === 'minutes' && (
                  <div className="custom-select-options">
                    {minutes.map(m => (
                      <div key={m} className="option" onClick={() => { handleMinutesChange({ target: { value: m } } as any); closeDropdowns(); }}>{m}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="block-sub-label">Minutes</div>
            </div>
          </div>
        </div>

        <div className="form-group block-group">
          <label className="block-label">
            <span className="label-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </span>
            PRIORITY
          </label>
          <div className="priority-options block-chips">
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
              <button
                key={p}
                type="button"
                className={`priority-option block-chip ${formData.priority === p ? `active ${monochromePriority ? 'priority-mono' : ''}` : ''}`}
                data-priority={p}
                onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
              >
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group block-group">
          <label className="block-label">
            <span className="label-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </span>
            CATEGORY
          </label>
          <div className="custom-select-container">
            <button 
              type="button"
              className={`custom-select-trigger ${openDropdown === 'category' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleDropdown('category'); }}
            >
              <span>{formData.category || 'None'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {openDropdown === 'category' && (
              <div className="custom-select-options">
                <div className="option" onClick={() => { setFormData(prev => ({ ...prev, category: '' })); closeDropdowns(); }}>None</div>
                {['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'].map(cat => (
                  <div key={cat} className="option" onClick={() => { setFormData(prev => ({ ...prev, category: cat })); closeDropdowns(); }}>{cat}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-group block-group">
          <label className="block-label">
            <span className="label-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </span>
            SEND TO
          </label>
          {selectedContact ? (
            <div className="contact-chip">
              <div className="contact-chip-avatar">
                <img 
                  src={`${config.backendUrl}/api/avatar?userId=${selectedContact.userId}`} 
                  alt={selectedContact.firstName || 'User'} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = selectedContact.firstName?.charAt(0) || selectedContact.username?.charAt(0) || '?';
                  }}
                />
              </div>
              <div className="contact-chip-info">
                <span className="contact-chip-name">
                  {selectedContact.firstName}{selectedContact.lastName ? ` ${selectedContact.lastName}` : ''}
                </span>
                {selectedContact.username && (
                  <span className="contact-chip-username">@{selectedContact.username}</span>
                )}
              </div>
              <button type="button" className="contact-chip-remove" onClick={handleClearContact}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ) : (
            <button type="button" className="contact-picker-btn" onClick={handleOpenContactPicker}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              <span>Choose Contact</span>
              <span className="contact-picker-hint">or leave empty for Self</span>
            </button>
          )}
        </div>

        {/* Contact Picker Modal */}
        {showContactPicker && (
          <div className="contact-modal-overlay" onClick={() => setShowContactPicker(false)}>
            <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
              <div className="contact-modal-header">
                <h3>Send To</h3>
                <button type="button" className="contact-modal-close" onClick={() => setShowContactPicker(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="contact-search-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  className="contact-search"
                  placeholder="Search by name or username..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="button" className="contact-invite-btn" onClick={handleInviteFriend}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Invite Friend</span>
              </button>
              <div className="contact-list">
                {filteredContacts.length === 0 ? (
                  <div className="contact-empty">
                    {contactsLoaded ? (
                      <>
                        <div style={{ marginBottom: '8px', fontWeight: 600 }}>No contacts found</div>
                        <div style={{ fontSize: '13px', opacity: 0.6, lineHeight: '1.4' }}>
                          Only users on your Friends List can be selected. Share your invite link to connect!
                        </div>
                      </>
                    ) : 'Loading...'}
                  </div>
                ) : (
                  filteredContacts.map(contact => (
                    <button
                      key={contact.userId}
                      type="button"
                      className="contact-item"
                      onClick={() => handleSelectContact(contact)}
                    >
                      <div className="contact-item-avatar">
                        <img 
                          src={`${config.backendUrl}/api/avatar?userId=${contact.userId}`} 
                          alt={contact.firstName || 'User'} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = contact.firstName?.charAt(0) || contact.username?.charAt(0) || '?';
                          }}
                        />
                      </div>
                      <div className="contact-item-info">
                        <span className="contact-item-name">
                          {contact.firstName}{contact.lastName ? ` ${contact.lastName}` : ''}
                        </span>
                        {contact.username && (
                          <span className="contact-item-username">@{contact.username}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="form-buttons">
          {editingReminder && (
            <button
              type="button"
              className="cancel-button"
              onClick={handleCancel}
            >
              <span>{strings.cancelEditButton}</span>
            </button>
          )}
          <button
            type="button"
            className="save-button"
            onClick={handleSave}
            disabled={!formData.text.trim() || !formData.year || !formData.month || !formData.day || !formData.hours || !formData.minutes}
          >
            <span className="save-button-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            </span>
            <span>{editingReminder ? strings.updateReminderButton : strings.createReminderButton}</span>
          </button>
        </div>
      </div>
    );
};
