import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Reminder } from '../types/reminder';
import type { Language } from '../i18n';
import { config } from '../config';
import { ConfirmModal } from './ConfirmModal';
import { ReminderCard } from './ReminderCard';
import { ReminderDetailModal } from './ReminderDetailModal';
import './ReminderList.css';

interface TelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface ReminderListProps {
  reminders: Reminder[];
  user?: TelegramUser | null;
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

export const ReminderList = ({
  reminders,
  user,
  onDelete,
  onEdit,
  onStatusChange,
  onClearPassed,
  strings,
  accentColor,
  monochromePriority,
}: ReminderListProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [selectedDetailReminder, setSelectedDetailReminder] = useState<Reminder | null>(null);

  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // Time-of-day greeting
  const greeting = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) return 'Good morning';
    if (currentHour >= 12 && currentHour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [currentHour]);

  const userName = user?.first_name || user?.username || 'User';

  // Counts for tabs
  const allActiveCount = useMemo(() => {
    return reminders.filter(r => !r.done && r.status !== 'done').length;
  }, [reminders]);

  const todayCount = useMemo(() => {
    return reminders.filter(r => !r.done && r.status !== 'done' && r.date === todayStr).length;
  }, [reminders, todayStr]);

  const upcomingCount = useMemo(() => {
    return reminders.filter(r => !r.done && r.status !== 'done' && r.date > todayStr).length;
  }, [reminders, todayStr]);

  const inProgressCount = useMemo(() => {
    return reminders.filter(r => r.status === 'in_progress' && !r.done).length;
  }, [reminders]);

  const completedCount = useMemo(() => {
    return reminders.filter(r => r.done || r.status === 'done').length;
  }, [reminders]);

  // Daily productivity progress
  const todayTotal = reminders.filter(r => r.date === todayStr).length;
  const todayDone = reminders.filter(r => r.date === todayStr && (r.done || r.status === 'done')).length;
  const progressPercent = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // Filter based on selected tab
  const filteredReminders = useMemo(() => {
    if (activeTab === 'completed') {
      return reminders.filter(r => r.done || r.status === 'done');
    }
    if (activeTab === 'today') {
      return reminders.filter(r => !r.done && r.status !== 'done' && r.date === todayStr);
    }
    if (activeTab === 'upcoming') {
      return reminders.filter(r => !r.done && r.status !== 'done' && r.date > todayStr);
    }
    // 'all' tab: all active reminders
    return reminders.filter(r => !r.done && r.status !== 'done');
  }, [reminders, activeTab, todayStr]);

  // Group reminders by date
  const groupedReminders = useMemo(() => {
    const groups: { [date: string]: Reminder[] } = {};
    const sorted = [...filteredReminders].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    sorted.forEach(r => {
      if (!groups[r.date]) {
        groups[r.date] = [];
      }
      groups[r.date].push(r);
    });

    return groups;
  }, [filteredReminders]);

  const formatDateHeader = (dateStr: string): { main: string; sub: string } => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
    const subStr = `${monthName} ${d}`;

    if (dateStr === todayStr) {
      return { main: 'Today', sub: subStr };
    }
    if (dateStr === tomorrowStr) {
      return { main: 'Tomorrow', sub: subStr };
    }
    const dayName = dateObj.toLocaleString('en-US', { weekday: 'short' });
    return { main: `${dayName}, ${subStr}`, sub: `${y}` };
  };

  const formatDate = (dateStr: string): string => {
    if (dateStr === todayStr) return strings.todayLabel;
    if (dateStr === tomorrowStr) return strings.tomorrowLabel;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return `${strings.daysShort[dateObj.getDay()]}, ${d} ${strings.monthsShort[m - 1]}`;
  };

  const formatTimeUntil = (date: string, time: string): string => {
    const rDate = new Date(`${date}T${time}:00`);
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
    <div className="reminder-list-page animate-fade-in">
      {/* Modern Liquid Glass Inbox Summary Banner */}
      <div className="inbox-summary-glass-card">
        <div className="inbox-summary-header">
          <div className="inbox-summary-title-wrap">
            <span className="inbox-summary-badge">Inbox</span>
            <span className="inbox-summary-sub">
              {allActiveCount === 0
                ? 'All caught up'
                : `${allActiveCount} pending • ${todayCount} today`}
            </span>
          </div>
          {completedCount > 0 && activeTab === 'completed' && (
            <button
              type="button"
              className="inbox-clear-completed-btn"
              onClick={() => setClearConfirmOpen(true)}
            >
              Clear Done
            </button>
          )}
        </div>

        {/* Quick Summary Stats */}
        <div className="inbox-quick-stat-bar">
          <div
            className={`inbox-stat-item ${activeTab === 'all' ? 'highlight' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span className="inbox-stat-val">{allActiveCount}</span>
            <span className="inbox-stat-lbl">Active</span>
          </div>
          <div className="inbox-stat-divider" />
          <div
            className={`inbox-stat-item ${activeTab === 'today' ? 'highlight' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            <span className="inbox-stat-val">{todayCount}</span>
            <span className="inbox-stat-lbl">Today</span>
          </div>
          <div className="inbox-stat-divider" />
          <div
            className={`inbox-stat-item ${activeTab === 'upcoming' ? 'highlight' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <span className="inbox-stat-val">{upcomingCount}</span>
            <span className="inbox-stat-lbl">Upcoming</span>
          </div>
          <div className="inbox-stat-divider" />
          <div
            className={`inbox-stat-item done ${activeTab === 'completed' ? 'highlight' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <span className="inbox-stat-val">{completedCount}</span>
            <span className="inbox-stat-lbl">Done</span>
          </div>
        </div>
      </div>

      {/* Modern Filter Tab Bar with dynamic counters & sliding Liquid Glass pill */}
      <div className="inbox-filter-bar">
        {[
          { id: 'all' as const, label: 'All', count: allActiveCount },
          { id: 'today' as const, label: 'Today', count: todayCount },
          { id: 'upcoming' as const, label: 'Upcoming', count: upcomingCount },
          { id: 'completed' as const, label: 'Done', count: completedCount },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`inbox-filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {isActive && (
                <motion.div
                  layoutId="inboxFilterIndicator"
                  className="inbox-filter-active-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 460,
                    damping: 32,
                    mass: 0.8,
                  }}
                />
              )}
              <span className="inbox-filter-btn-text">{tab.label}</span>
              {tab.count > 0 && <span className="tab-counter-badge">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Reminder Cards / Groups */}
      {Object.keys(groupedReminders).length === 0 ? (
        <div className="reminder-empty-state">
          <div className="empty-icon">
            {activeTab === 'completed' ? '🎉' : activeTab === 'today' ? '✨' : '📅'}
          </div>
          <div className="empty-title">
            {activeTab === 'completed'
              ? 'No completed reminders'
              : activeTab === 'today'
              ? 'No reminders for today'
              : 'No reminders found'}
          </div>
          <div className="empty-desc">
            {activeTab === 'completed'
              ? 'Mark reminders as done to see them here'
              : 'Create a new reminder to get started'}
          </div>
        </div>
      ) : (
        Object.entries(groupedReminders).map(([dateStr, dateReminders]) => {
          const header = formatDateHeader(dateStr);
          return (
            <div key={dateStr} className="reminder-date-group">
              <div className="date-group-header">
                <span className="date-group-title">{header.main}</span>
                <span className="date-group-count">{dateReminders.length}</span>
              </div>
              <div className="date-group-cards">
                {dateReminders.map(reminder => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onDelete={(id) => setDeleteConfirmId(id)}
                    onEdit={() => setSelectedDetailReminder(reminder)}
                    onStatusChange={onStatusChange}
                    isPassed={new Date(`${reminder.date}T${reminder.time}:00`).getTime() <= now.getTime()}
                    formatDate={formatDate}
                    formatTimeUntil={formatTimeUntil}
                    accentColor={accentColor}
                    monochromePriority={monochromePriority}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Clear Completed Action */}
      {activeTab === 'completed' && completedCount > 0 && (
        <div className="clear-completed-bar">
          <button
            type="button"
            className="clear-completed-btn"
            onClick={() => setClearConfirmOpen(true)}
          >
            Clear All Completed
          </button>
        </div>
      )}

      {/* Reminder Detail Modal (Opens when tapping on any card) */}
      <ReminderDetailModal
        reminder={selectedDetailReminder}
        isOpen={!!selectedDetailReminder}
        onClose={() => setSelectedDetailReminder(null)}
        onEdit={(r) => {
          setSelectedDetailReminder(null);
          onEdit(r);
        }}
        onDelete={(id) => {
          setSelectedDetailReminder(null);
          setDeleteConfirmId(id);
        }}
        onStatusChange={onStatusChange}
        formatDate={formatDate}
        formatTimeUntil={formatTimeUntil}
        monochromePriority={monochromePriority}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <ConfirmModal
          isOpen={true}
          title="Delete Reminder"
          message="Are you sure you want to delete this reminder?"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            onDelete(deleteConfirmId);
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
          isDestructive={true}
        />
      )}

      {/* Clear All Confirmation Modal */}
      {clearConfirmOpen && (
        <ConfirmModal
          isOpen={true}
          title="Clear Completed Reminders"
          message="Are you sure you want to clear all completed reminders from your database?"
          confirmText="Clear All"
          cancelText="Cancel"
          onConfirm={() => {
            onClearPassed();
            setClearConfirmOpen(false);
          }}
          onCancel={() => setClearConfirmOpen(false)}
          isDestructive={true}
        />
      )}
    </div>
  );
};
