import { useState } from 'react';
import type { Reminder } from '../types/reminder';
import type { Language } from '../i18n';

import { ConfirmModal } from './ConfirmModal';
import './ReminderList.css';

interface ReminderListProps {
  reminders: Reminder[];
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onStatusChange?: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  onClearPassed: () => void;
  language: Language;
  accentColor: string;
  monochromePriority: boolean;
  strings: {
    nextReminderTitle: string;
    allRemindersTitle: string;
    emptyTitle: string;
    emptyHint: string;
    editAria: string;
    deleteAria: string;
    clearPassedButton: string;
    todayLabel: string;
    tomorrowLabel: string;
    daysShort: string[];
    monthsShort: string[];
    passedLabel: string;
    inDaysHours: (days: number, hours: number) => string;
    inHoursMinutes: (hours: number, minutes: number) => string;
    inMinutes: (minutes: number) => string;
  };
}

import { ReminderCard } from './ReminderCard';

export const ReminderList = ({ reminders, onDelete, onEdit, onStatusChange, onClearPassed, strings, accentColor, monochromePriority }: ReminderListProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'MINE' | 'RECEIVED'>('ALL');
  const now = new Date().getTime();

  // Filter based on sender/recipient selection
  const filteredReminders = reminders.filter(r => {
    if (filter === 'MINE') return !r.isSentToMe;
    if (filter === 'RECEIVED') return !!r.isSentToMe;
    return true;
  });

  // Filter and sort
  const activeReminders = filteredReminders
    .filter(r => {
      const reminderTime = new Date(r.date + 'T' + r.time + ':00').getTime();
      return reminderTime > now && !r.done;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const passedReminders = filteredReminders
    .filter(r => {
      const reminderTime = new Date(r.date + 'T' + r.time + ':00').getTime();
      return reminderTime <= now || r.done;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (reminders.length === 0) {
    return (
      <div className="reminder-list empty">
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <p className="empty-text">{strings.emptyTitle}</p>
          <p className="empty-hint">{strings.emptyHint}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) return strings.todayLabel;
    if (dateOnly.getTime() === tomorrowOnly.getTime()) return strings.tomorrowLabel;
    return `${strings.daysShort[date.getDay()]}, ${date.getDate()} ${strings.monthsShort[date.getMonth()]}`;
  };

  const formatTimeUntil = (date: string, time: string): string => {
    const rDate = new Date(date + 'T' + time + ':00');
    const diff = rDate.getTime() - new Date().getTime();
    if (diff < 0) return strings.passedLabel;
    
    const totalMinutes = Math.ceil(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;

    if (days > 0) return strings.inDaysHours(days, hours);
    if (hours > 0) return strings.inHoursMinutes(hours, mins);
    return strings.inMinutes(Math.max(1, mins));
  };

  return (
    <div className="reminder-list">
      <div className="list-filter-chips">
        <button 
          type="button" 
          className={`filter-chip ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All
        </button>
        <button 
          type="button" 
          className={`filter-chip ${filter === 'MINE' ? 'active' : ''}`}
          onClick={() => setFilter('MINE')}
        >
          My Reminders
        </button>
        <button 
          type="button" 
          className={`filter-chip ${filter === 'RECEIVED' ? 'active' : ''}`}
          onClick={() => setFilter('RECEIVED')}
        >
          Sent to Me
        </button>
      </div>

      {activeReminders.length === 0 && passedReminders.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div className="empty-icon">📂</div>
          <p className="empty-text">No Reminders</p>
          <p className="empty-hint">No reminders found in this category.</p>
        </div>
      ) : (
        <>
          {activeReminders.length > 0 && (
            <div className="reminders-section">
              <div className="section-header">
                <h3>New Reminders</h3>
              </div>
              {activeReminders.map(r => (
                <ReminderCard 
                  key={r.id} 
                  reminder={r} 
                  onDelete={setDeleteConfirmId} 
                  onEdit={onEdit} 
                  onStatusChange={onStatusChange}
                  isPassed={false} 
                  formatDate={formatDate}
                  formatTimeUntil={formatTimeUntil}
                  accentColor={accentColor}
                  monochromePriority={monochromePriority}
                />
              ))}
            </div>
          )}

          {passedReminders.length > 0 && (
            <div className="reminders-section">
              <div className="section-header">
                <h3>History</h3>
                <button className="clear-passed-button" onClick={() => setClearConfirmOpen(true)}>
                  Clear All
                </button>
              </div>
              {passedReminders.map(r => (
                <ReminderCard 
                  key={r.id} 
                  reminder={r} 
                  onDelete={setDeleteConfirmId} 
                  onStatusChange={onStatusChange}
                  isPassed={true} 
                  formatDate={formatDate}
                  formatTimeUntil={formatTimeUntil}
                  accentColor={accentColor}
                  monochromePriority={monochromePriority}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirmId) {
            onDelete(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmModal
        isOpen={clearConfirmOpen}
        title="Clear History"
        message="Are you sure you want to delete all past reminders? This will clear your entire history."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        onConfirm={() => {
          onClearPassed();
          setClearConfirmOpen(false);
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
};
