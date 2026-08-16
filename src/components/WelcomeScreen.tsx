import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Reminder } from '../types/reminder';
import { ReminderCard } from './ReminderCard';
import { ReminderDetailModal } from './ReminderDetailModal';
import { config } from '../config';
import './WelcomeScreen.css';

interface TelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface WelcomeScreenProps {
  reminders: Reminder[];
  user?: TelegramUser | null;
  accentColor: string;
  monochromePriority: boolean;
  onNavigateToInbox: () => void;
  onNavigateToCreate: () => void;
  onNavigateToActivity: () => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  reminders,
  user,
  accentColor,
  monochromePriority,
  onNavigateToInbox,
  onNavigateToCreate,
  onNavigateToActivity,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedDetailReminder, setSelectedDetailReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const timeFormatted = `${String(hours).padStart(2, '0')}:${minutes}`;

  const greeting = useMemo(() => {
    if (hours >= 5 && hours < 12) return 'Good morning';
    if (hours >= 12 && hours < 18) return 'Good afternoon';
    if (hours >= 18 && hours < 23) return 'Good evening';
    return 'Good night';
  }, [hours]);

  const dateFormatted = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [currentTime]);

  const todayStr = useMemo(() => {
    const now = currentTime;
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, [currentTime]);

  const userName = user?.first_name || user?.username || 'there';

  // Today's reminders
  const todayReminders = useMemo(() => {
    return reminders
      .filter((r) => r.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [reminders, todayStr]);

  const todayTotal = todayReminders.length;
  const todayDone = todayReminders.filter((r) => r.done || r.status === 'done').length;
  const todayRemaining = todayTotal - todayDone;
  const progressPercent = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const totalAllActive = useMemo(() => {
    return reminders.filter((r) => !r.done && r.status !== 'done').length;
  }, [reminders]);

  return (
    <div className="welcome-screen-container">
      {/* 1. Header with Avatar & Greeting */}
      <motion.div
        className="welcome-hero-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="welcome-hero-top">
          <div className="welcome-avatar-wrapper">
            {user?.id ? (
              <img
                src={`${config.backendUrl}/api/avatar?userId=${user.id}&name=${encodeURIComponent(userName)}`}
                alt={userName}
                className="welcome-avatar-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerText = userName.charAt(0).toUpperCase();
                }}
              />
            ) : (
              <div className="welcome-avatar-placeholder">{userName.charAt(0).toUpperCase()}</div>
            )}
          </div>

          <div className="welcome-time-chip">
            <span className="welcome-live-dot" />
            <span className="welcome-live-time">{timeFormatted}</span>
          </div>
        </div>

        <div className="welcome-hero-greeting-block">
          <span className="welcome-date-label">{dateFormatted}</span>
          <h2 className="welcome-greeting-title">
            {greeting}, <span className="welcome-user-highlight">{userName}</span>
          </h2>
        </div>

        {/* Today's Progress Bar */}
        <div className="welcome-progress-section">
          <div className="welcome-progress-meta">
            <span className="welcome-progress-title">Today's Progress</span>
            <span className="welcome-progress-percent">{progressPercent}%</span>
          </div>
          <div className="welcome-progress-track">
            <motion.div
              className="welcome-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <div className="welcome-stats-row">
            <div className="welcome-stat-pill">
              <span className="stat-num">{todayTotal}</span>
              <span className="stat-label">Total today</span>
            </div>
            <div className="welcome-stat-pill">
              <span className="stat-num done-num">{todayDone}</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="welcome-stat-pill">
              <span className="stat-num remaining-num">{todayRemaining}</span>
              <span className="stat-label">Remaining</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Today's Reminders Section */}
      <div className="welcome-section-header">
        <div className="section-title-wrap">
          <h3>Today's Schedule</h3>
          <span className="section-count-badge">{todayReminders.length}</span>
        </div>
        <button
          type="button"
          className="welcome-view-all-btn"
          onClick={onNavigateToInbox}
        >
          View Inbox ({totalAllActive})
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {todayReminders.length > 0 ? (
        <div className="welcome-reminders-list">
          <AnimatePresence>
            {todayReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onDelete={onDelete}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
                onOpenDetail={(r) => setSelectedDetailReminder(r)}
                accentColor={accentColor}
                monochromePriority={monochromePriority}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          className="welcome-empty-card"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="welcome-empty-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 14 14"></polyline>
            </svg>
          </div>
          <h4>No reminders for today</h4>
          <p>You have a clear schedule. Take a break or plan something ahead!</p>
          <button
            type="button"
            className="welcome-create-action-btn"
            onClick={onNavigateToCreate}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create New Reminder
          </button>
        </motion.div>
      )}

      {/* 3. Quick Action Cards & Primary Open Button */}
      <div className="welcome-quick-actions">
        <div className="welcome-action-tile" onClick={onNavigateToCreate}>
          <div className="action-tile-icon create-tile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div className="action-tile-info">
            <span className="action-tile-title">New Reminder</span>
            <span className="action-tile-sub">Set a task with alerts</span>
          </div>
        </div>

        <div className="welcome-action-tile" onClick={onNavigateToActivity}>
          <div className="action-tile-icon activity-tile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div className="action-tile-info">
            <span className="action-tile-title">Activity</span>
            <span className="action-tile-sub">Calendar & statistics</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="welcome-open-app-primary-btn"
        onClick={onNavigateToInbox}
      >
        <span>Open Inbox</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Detail Modal */}
      {selectedDetailReminder && (
        <ReminderDetailModal
          reminder={selectedDetailReminder}
          onClose={() => setSelectedDetailReminder(null)}
          onEdit={(r) => {
            setSelectedDetailReminder(null);
            onEdit(r);
          }}
          onDelete={(id) => {
            setSelectedDetailReminder(null);
            onDelete(id);
          }}
          onStatusChange={(id, status) => {
            if (onStatusChange) onStatusChange(id, status);
            setSelectedDetailReminder((prev) => (prev ? { ...prev, status, done: status === 'done' } : null));
          }}
          accentColor={accentColor}
          monochromePriority={monochromePriority}
        />
      )}
    </div>
  );
};
