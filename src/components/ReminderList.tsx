import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Reminder } from '../types/reminder';
import type { Language } from '../i18n';
import { config } from '../config';
import { unifyGroupReminders } from '../utils/reminder';
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
  onModalOpenChange?: (open: boolean) => void;
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
  onModalOpenChange,
}: ReminderListProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'completed'>('all');
  const [activeScopeTab, setActiveScopeTab] = useState<'all' | 'me' | 'friends' | 'groups'>('all');
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);

  const currentUserId = user?.id;

  // Unify group reminders into single cards with live participant statuses
  const unifiedReminders = useMemo(() => {
    return unifyGroupReminders(reminders, currentUserId);
  }, [reminders, currentUserId]);

  const selectedDetailReminder = useMemo(() => {
    if (!selectedReminderId) return null;
    return unifiedReminders.find(r => r.id === selectedReminderId) || null;
  }, [unifiedReminders, selectedReminderId]);

  const openDetailModal = (r: Reminder) => {
    setSelectedReminderId(r.id);
    onModalOpenChange?.(true);
  };
  const closeDetailModal = () => {
    setSelectedReminderId(null);
    if (!deleteConfirmId && !clearConfirmOpen) {
      onModalOpenChange?.(false);
    }
  };

  const openDeleteConfirm = (id: string) => {
    setDeleteConfirmId(id);
    onModalOpenChange?.(true);
  };
  const closeDeleteConfirm = () => {
    setDeleteConfirmId(null);
    if (!selectedReminderId && !clearConfirmOpen) {
      onModalOpenChange?.(false);
    }
  };

  const openClearConfirm = () => {
    setClearConfirmOpen(true);
    onModalOpenChange?.(true);
  };
  const closeClearConfirm = () => {
    setClearConfirmOpen(false);
    if (!selectedReminderId && !deleteConfirmId) {
      onModalOpenChange?.(false);
    }
  };

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

  // Counts for status banner
  const allActiveCount = useMemo(() => {
    return unifiedReminders.filter(r => !r.done && r.status !== 'done').length;
  }, [unifiedReminders]);

  const todayCount = useMemo(() => {
    return unifiedReminders.filter(r => !r.done && r.status !== 'done' && r.date === todayStr).length;
  }, [unifiedReminders, todayStr]);

  const completedCount = useMemo(() => {
    return unifiedReminders.filter(r => r.done || r.status === 'done').length;
  }, [unifiedReminders]);

  // Scope filter counts based on active status filter
  const totalTabCount = useMemo(() => {
    if (statusFilter === 'completed') return completedCount;
    if (statusFilter === 'today') return todayCount;
    return allActiveCount;
  }, [statusFilter, completedCount, todayCount, allActiveCount]);

  const meCount = useMemo(() => {
    const list = statusFilter === 'completed'
      ? unifiedReminders.filter(r => r.done || r.status === 'done')
      : statusFilter === 'today'
      ? unifiedReminders.filter(r => !r.done && r.status !== 'done' && r.date === todayStr)
      : unifiedReminders.filter(r => !r.done && r.status !== 'done');
    return list.filter(r => !r.assignedTo && !r.assignedToChatId && (!r.groupParticipants || r.groupParticipants.length <= 1)).length;
  }, [unifiedReminders, statusFilter, todayStr]);

  const friendsCount = useMemo(() => {
    const list = statusFilter === 'completed'
      ? unifiedReminders.filter(r => r.done || r.status === 'done')
      : statusFilter === 'today'
      ? unifiedReminders.filter(r => !r.done && r.status !== 'done' && r.date === todayStr)
      : unifiedReminders.filter(r => !r.done && r.status !== 'done');
    return list.filter(r => (r.assignedTo || r.assignedToChatId) && (!r.groupParticipants || r.groupParticipants.length <= 1)).length;
  }, [unifiedReminders, statusFilter, todayStr]);

  const groupsCount = useMemo(() => {
    const list = statusFilter === 'completed'
      ? unifiedReminders.filter(r => r.done || r.status === 'done')
      : statusFilter === 'today'
      ? unifiedReminders.filter(r => !r.done && r.status !== 'done' && r.date === todayStr)
      : unifiedReminders.filter(r => !r.done && r.status !== 'done');
    return list.filter(r => r.groupParticipants && r.groupParticipants.length > 1).length;
  }, [unifiedReminders, statusFilter, todayStr]);

  // Filter reminders based on top statusFilter AND activeScopeTab
  const filteredReminders = useMemo(() => {
    let list = unifiedReminders;

    // 1. Status filter (Active / Today / Completed)
    if (statusFilter === 'completed') {
      list = list.filter(r => r.done || r.status === 'done');
    } else if (statusFilter === 'today') {
      list = list.filter(r => !r.done && r.status !== 'done' && r.date === todayStr);
    } else {
      // 'all': all active
      list = list.filter(r => !r.done && r.status !== 'done');
    }

    // 2. Scope tab filter (All Tasks / For Me / Friends / Groups)
    if (activeScopeTab === 'me') {
      list = list.filter(r => !r.assignedTo && !r.assignedToChatId && (!r.groupParticipants || r.groupParticipants.length <= 1));
    } else if (activeScopeTab === 'friends') {
      list = list.filter(r => (r.assignedTo || r.assignedToChatId) && (!r.groupParticipants || r.groupParticipants.length <= 1));
    } else if (activeScopeTab === 'groups') {
      list = list.filter(r => r.groupParticipants && r.groupParticipants.length > 1);
    }

    return list;
  }, [unifiedReminders, statusFilter, activeScopeTab, todayStr]);

  const getPriorityRank = (p?: string) => {
    const lower = (p || '').toLowerCase();
    if (lower === 'high') return 3;
    if (lower === 'medium') return 2;
    if (lower === 'low') return 1;
    return 0;
  };

  // Group reminders by date and sort priority-first within each group
  const groupedReminders = useMemo(() => {
    const groups: { [date: string]: Reminder[] } = {};
    const sorted = [...filteredReminders].sort((a, b) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;

      // High priority first
      const prioDiff = getPriorityRank(b.priority) - getPriorityRank(a.priority);
      if (prioDiff !== 0) return prioDiff;

      return (a.time || '').localeCompare(b.time || '');
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
    try {
      if (dateStr === todayStr) {
        return { main: 'Today', sub: '' };
      }
      if (dateStr === tomorrowStr) {
        return { main: 'Tomorrow', sub: '' };
      }
      const [y, m, d] = (dateStr || '').split('-').map(Number);
      if (!y || !m || !d) return { main: dateStr || 'Today', sub: '' };
      const dateObj = new Date(y, m - 1, d);
      if (isNaN(dateObj.getTime())) return { main: dateStr || 'Today', sub: '' };
      const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
      const subStr = `${monthName} ${d}`;
      const dayName = dateObj.toLocaleString('en-US', { weekday: 'short' });
      return { main: `${dayName}, ${subStr}`, sub: `${y}` };
    } catch {
      return { main: dateStr || 'Today', sub: '' };
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      if (dateStr === todayStr) return strings?.todayLabel || 'Today';
      if (dateStr === tomorrowStr) return strings?.tomorrowLabel || 'Tomorrow';
      const [y, m, d] = (dateStr || '').split('-').map(Number);
      if (!y || !m || !d) return dateStr || '';
      const dateObj = new Date(y, m - 1, d);
      if (isNaN(dateObj.getTime())) return dateStr || '';
      const dayName = strings?.daysShort?.[dateObj.getDay()] || '';
      const monthName = strings?.monthsShort?.[m - 1] || '';
      return `${dayName}, ${d} ${monthName}`;
    } catch {
      return dateStr || '';
    }
  };

  const formatTimeUntil = (date: string, time: string): string => {
    try {
      if (!date || !time) return '';
      const rDate = new Date(`${date}T${time}:00`);
      const diff = rDate.getTime() - new Date().getTime();
      if (isNaN(diff)) return '';
      if (diff < 0) return strings?.passedLabel || 'passed';

      const totalMinutes = Math.ceil(diff / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const mins = totalMinutes % 60;

      if (days > 0) return strings?.inDaysHours ? strings.inDaysHours(days, hours) : `in ${days}d ${hours}h`;
      if (hours > 0) return strings?.inHoursMinutes ? strings.inHoursMinutes(hours, mins) : `in ${hours}h ${mins}m`;
      return strings?.inMinutes ? strings.inMinutes(Math.max(1, mins)) : `in ${Math.max(1, mins)}m`;
    } catch {
      return '';
    }
  };

  return (
    <div className="reminder-list-page animate-fade-in">
      {/* Modern Liquid Glass Inbox Summary Banner with 3 Time/Status Buttons */}
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
          {completedCount > 0 && statusFilter === 'completed' && (
            <button
              type="button"
              className="inbox-clear-completed-btn"
              onClick={() => setClearConfirmOpen(true)}
            >
              Clear Done
            </button>
          )}
        </div>

        {/* Quick Summary Stats (3 Clean Items: Active, Today, Done) */}
        <div className="inbox-quick-stat-bar">
          <div
            className={`inbox-stat-item ${statusFilter === 'all' ? 'highlight' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <span className="inbox-stat-val">{allActiveCount}</span>
            <span className="inbox-stat-lbl">Active</span>
          </div>
          <div className="inbox-stat-divider" />
          <div
            className={`inbox-stat-item ${statusFilter === 'today' ? 'highlight' : ''}`}
            onClick={() => setStatusFilter('today')}
          >
            <span className="inbox-stat-val">{todayCount}</span>
            <span className="inbox-stat-lbl">Today</span>
          </div>
          <div className="inbox-stat-divider" />
          <div
            className={`inbox-stat-item done ${statusFilter === 'completed' ? 'highlight' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            <span className="inbox-stat-val">{completedCount}</span>
            <span className="inbox-stat-lbl">Done</span>
          </div>
        </div>
      </div>

      {/* 4 Main Category Tabs: All Tasks, For Me, Friends, Groups (Zero emojis) */}
      <div className="inbox-filter-bar">
        {[
          { id: 'all' as const, label: 'All Tasks', count: totalTabCount },
          { id: 'me' as const, label: 'For Me', count: meCount },
          { id: 'friends' as const, label: 'Friends', count: friendsCount },
          { id: 'groups' as const, label: 'Groups', count: groupsCount },
        ].map((tab) => {
          const isActive = activeScopeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`inbox-filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveScopeTab(tab.id)}
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
            {statusFilter === 'completed' ? '🎉' : statusFilter === 'today' ? '✨' : '📅'}
          </div>
          <div className="empty-title">
            {statusFilter === 'completed'
              ? 'No completed reminders'
              : statusFilter === 'today'
              ? 'No reminders for today'
              : 'No reminders found'}
          </div>
          <div className="empty-desc">
            {statusFilter === 'completed'
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
                    onDelete={(id) => openDeleteConfirm(id)}
                    onEdit={() => openDetailModal(reminder)}
                    onStatusChange={onStatusChange}
                    isPassed={new Date(`${reminder.date}T${reminder.time}:00`).getTime() <= now.getTime()}
                    formatDate={formatDate}
                    formatTimeUntil={formatTimeUntil}
                    accentColor={accentColor}
                    monochromePriority={monochromePriority}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Clear Completed Action */}
      {statusFilter === 'completed' && completedCount > 0 && (
        <div className="clear-completed-bar">
          <button
            type="button"
            className="clear-completed-btn"
            onClick={openClearConfirm}
          >
            Clear All Completed
          </button>
        </div>
      )}


      {/* Reminder Detail Modal (Opens when tapping on any card) */}
      <ReminderDetailModal
        reminder={selectedDetailReminder}
        isOpen={!!selectedDetailReminder}
        onClose={closeDetailModal}
        onEdit={(r) => {
          closeDetailModal();
          onEdit(r);
        }}
        onDelete={(id) => {
          closeDetailModal();
          openDeleteConfirm(id);
        }}
        onStatusChange={onStatusChange}
        formatDate={formatDate}
        formatTimeUntil={formatTimeUntil}
        monochromePriority={monochromePriority}
        currentUserId={currentUserId}
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
            closeDeleteConfirm();
          }}
          onCancel={closeDeleteConfirm}
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
            closeClearConfirm();
          }}
          onCancel={closeClearConfirm}
          isDestructive={true}
        />
      )}
    </div>

  );
};
