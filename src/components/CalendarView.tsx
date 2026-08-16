import { useState, useMemo } from 'react';
import { Reminder } from '../types/reminder';
import type { Stats } from '../types/reminder';
import './CalendarView.css';

interface CalendarViewProps {
  reminders: Reminder[];
  accentColor: string;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  monochromePriority: boolean;
  stats: Stats;
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

interface ActivityItem {
  id: string;
  type: 'created' | 'completed' | 'friend_completed' | 'invited' | 'updated';
  title: string;
  subtitle?: string;
  time: string;
  dateGroup: 'Today' | 'Yesterday' | 'Earlier';
  iconType: 'pin' | 'check' | 'user' | 'invite' | 'edit';
}

export const CalendarView = ({
  reminders,
  stats,
  onStatusChange,
  onEdit,
  onDelete
}: CalendarViewProps) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'feed' | 'archive'>('analytics');

  // Completed / Archived reminders
  const completedReminders = useMemo(() => {
    return reminders.filter(r => r.done || r.status === 'done');
  }, [reminders]);

  const activeReminders = useMemo(() => {
    return reminders.filter(r => !r.done && r.status !== 'done');
  }, [reminders]);

  // Productivity Score Calculation
  const totalTasks = reminders.length;
  const doneTasks = completedReminders.length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Category Distribution
  const categoryStats = useMemo(() => {
    const counts: { [cat: string]: number } = {};
    reminders.forEach(r => {
      const cat = r.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [reminders]);

  // Generate chronological activity feed
  const activityFeed = useMemo(() => {
    const feed: ActivityItem[] = [];

    reminders.forEach((r) => {
      if (r.done || r.status === 'done') {
        feed.push({
          id: `done-${r.id}`,
          type: r.isSentToMe ? 'friend_completed' : 'completed',
          title: r.isSentToMe ? `${r.creatorName || 'Friend'} completed` : 'Reminder completed',
          subtitle: r.text,
          time: r.time || '12:00',
          dateGroup: 'Today',
          iconType: r.isSentToMe ? 'user' : 'check'
        });
      } else {
        feed.push({
          id: `created-${r.id}`,
          type: 'created',
          title: r.assignedTo ? `Reminder for ${r.assignedTo.replace(/^@/, '')}` : 'New reminder',
          subtitle: r.text,
          time: r.time || '10:00',
          dateGroup: 'Today',
          iconType: 'pin'
        });
      }
    });

    if (stats.totalDeleted > 0) {
      feed.push({
        id: 'del-stat',
        type: 'updated',
        title: 'Archive updated',
        subtitle: `${stats.totalDeleted} reminders cleared`,
        time: 'Yesterday',
        dateGroup: 'Yesterday',
        iconType: 'edit'
      });
    }

    return feed;
  }, [reminders, stats]);

  const groupedFeed = useMemo(() => {
    const groups: { [key: string]: ActivityItem[] } = {
      Today: [],
      Yesterday: []
    };
    activityFeed.forEach(item => {
      if (!groups[item.dateGroup]) groups[item.dateGroup] = [];
      groups[item.dateGroup].push(item);
    });
    return groups;
  }, [activityFeed]);

  const renderIcon = (type: ActivityItem['iconType']) => {
    switch (type) {
      case 'pin':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        );
      case 'check':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        );
      case 'user':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
      case 'edit':
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        );
    }
  };

  // Ring Chart Calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <div className="activity-screen-container animate-fade-in">
      {/* Sub-tabs: Analytics & Charts | Activity Feed | Archive */}
      <div className="activity-tabs-row">
        <div className="activity-subtabs">
          <button
            className={`activity-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics & Reports
          </button>
          <button
            className={`activity-tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            Feed
          </button>
          <button
            className={`activity-tab ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => setActiveTab('archive')}
          >
            Archive ({completedReminders.length})
          </button>
        </div>
      </div>

      {/* 1. ANALYTICS & REPORTS TAB */}
      {activeTab === 'analytics' && (
        <div className="activity-analytics-view animate-fade-in">
          {/* Circular Completion Ring Card */}
          <div className="analytics-ring-card">
            <div className="ring-chart-container">
              <svg className="progress-ring-svg" width="130" height="130">
                <circle
                  className="ring-bg-circle"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="10"
                  fill="transparent"
                  r={radius}
                  cx="65"
                  cy="65"
                />
                <circle
                  className="ring-progress-circle"
                  stroke="var(--accent-color)"
                  strokeWidth="10"
                  strokeDasharray={`${circumference} ${circumference}`}
                  style={{ strokeDashoffset }}
                  strokeLinecap="round"
                  fill="transparent"
                  r={radius}
                  cx="65"
                  cy="65"
                />
              </svg>
              <div className="ring-center-text">
                <span className="ring-percent-num">{completionRate}%</span>
                <span className="ring-percent-label">Completed</span>
              </div>
            </div>

            <div className="ring-card-details">
              <h4 className="ring-card-title">Productivity Score</h4>
              <p className="ring-card-sub">
                {doneTasks} of {totalTasks} reminders completed
              </p>
              <div className="ring-pills-row">
                <span className="ring-pill done">
                  <span className="pill-dot done"></span> {doneTasks} Done
                </span>
                <span className="ring-pill active">
                  <span className="pill-dot active"></span> {activeReminders.length} Active
                </span>
              </div>
            </div>
          </div>

          {/* 4 Quick Stat Summary Boxes */}
          <div className="stats-summary-grid">
            <div className="summary-stat-card">
              <div className="stat-card-icon done">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="summary-stat-number">{doneTasks}</span>
              <span className="summary-stat-label">Completed</span>
            </div>

            <div className="summary-stat-card">
              <div className="stat-card-icon active">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <span className="summary-stat-number">{activeReminders.length}</span>
              <span className="summary-stat-label">Pending</span>
            </div>

            <div className="summary-stat-card">
              <div className="stat-card-icon total">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              </div>
              <span className="summary-stat-number">{stats.totalCreated || totalTasks}</span>
              <span className="summary-stat-label">Total Created</span>
            </div>

            <div className="summary-stat-card">
              <div className="stat-card-icon overdue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
              <span className="summary-stat-number">{stats.overdue}</span>
              <span className="summary-stat-label">Overdue</span>
            </div>
          </div>

          {/* Category Distribution Breakdown */}
          {categoryStats.length > 0 && (
            <div className="analytics-section-card">
              <h4 className="analytics-card-title">Category Breakdown</h4>
              <div className="category-bars-list">
                {categoryStats.map(([categoryName, count]) => {
                  const percent = Math.round((count / totalTasks) * 100);
                  return (
                    <div key={categoryName} className="category-bar-row">
                      <div className="category-bar-info">
                        <span className="category-name">{categoryName}</span>
                        <span className="category-count">{count} ({percent}%)</span>
                      </div>
                      <div className="category-progress-track">
                        <div
                          className="category-progress-fill"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. ACTIVITY FEED TAB */}
      {activeTab === 'feed' && (
        <div className="activity-feed-list animate-fade-in">
          {Object.entries(groupedFeed).map(([groupName, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupName} className="activity-date-group">
                <div className="activity-group-header">{groupName}</div>
                <div className="activity-group-cards">
                  {items.map(item => (
                    <div key={item.id} className="activity-item-card">
                      <div className={`activity-icon-wrapper ${item.iconType}`}>
                        {renderIcon(item.iconType)}
                      </div>
                      <div className="activity-info">
                        <span className="activity-title">{item.title}</span>
                        {item.subtitle && (
                          <span className="activity-subtitle">{item.subtitle}</span>
                        )}
                      </div>
                      <span className="activity-timestamp">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {activityFeed.length === 0 && (
            <div className="activity-empty">
              <div className="empty-icon">📊</div>
              <p className="empty-title">No recent activity</p>
              <p className="empty-desc">Your reminders and friend interactions will be logged here.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. ARCHIVE TAB */}
      {activeTab === 'archive' && (
        <div className="activity-archive-view animate-fade-in">
          <div className="archive-header-info">
            <span className="archive-count-label">{completedReminders.length} archived reminders</span>
          </div>

          {completedReminders.length === 0 ? (
            <div className="activity-empty">
              <div className="empty-icon">📦</div>
              <p className="empty-title">Archive is empty</p>
              <p className="empty-desc">Completed reminders are stored here for your reference.</p>
            </div>
          ) : (
            <div className="archive-cards-list">
              {completedReminders.map(reminder => (
                <div key={reminder.id} className="archive-item-card">
                  <div className="archive-item-content">
                    <div className="archive-item-top">
                      <span className="archive-date-tag">{reminder.date} at {reminder.time}</span>
                      {reminder.category && (
                        <span className="archive-category-tag">{reminder.category}</span>
                      )}
                    </div>
                    <div className="archive-item-text">{reminder.text}</div>
                    {reminder.assignedTo && (
                      <span className="archive-item-sub">For: {reminder.assignedTo}</span>
                    )}
                  </div>

                  {/* Quick Action to Reopen / Delete from Archive */}
                  <div className="archive-actions-row">
                    {onStatusChange && (
                      <button
                        type="button"
                        className="archive-restore-btn"
                        onClick={() => onStatusChange(reminder.id, 'todo')}
                        title="Reactivate reminder"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10"></polyline>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                        <span>Restore</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="archive-del-btn"
                        onClick={() => onDelete(reminder.id)}
                        title="Permanently remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
