import { useState, useMemo, useEffect } from 'react';
import { Reminder } from '../types/reminder';
import type { Stats } from '../types/reminder';
import { ReminderCard } from './ReminderCard';
import { ConfirmModal } from './ConfirmModal';
import './CalendarView.css';

interface CalendarViewProps {
  reminders: Reminder[];
  accentColor: string;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
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

export const CalendarView = ({ reminders, accentColor, onEdit, onDelete, monochromePriority, stats, strings }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [calendarSubTab, setCalendarSubTab] = useState<'calendar' | 'activity'>('calendar');
  const [chartType, setChartType] = useState<'ring' | 'bar'>('ring');
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    if (calendarSubTab === 'activity') {
      setAnimateBars(false);
      const timer = setTimeout(() => setAnimateBars(true), 50);
      return () => clearTimeout(timer);
    }
  }, [calendarSubTab, chartType]);

  const maxVal = useMemo(() => {
    return Math.max(stats.done, stats.inProgress, stats.todo, stats.overdue, 1);
  }, [stats]);

  const getBarHeight = (value: number) => {
    return `${(value / maxVal) * 100}%`;
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    // Adjust firstDay for Monday start (0=Mon, 6=Sun)
    const startDay = (firstDay + 6) % 7;
    
    const days = [];
    // Previous month padding
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, date: null });
    }
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayReminders = reminders.filter(r => r.date === dateStr && !r.done);
      days.push({ day: d, date: dateStr, hasReminders: dayReminders.length > 0, count: dayReminders.length });
    }
    return days;
  }, [currentDate, reminders]);

  const selectedDayReminders = useMemo(() => {
    if (!selectedDate) return [];
    return reminders.filter(r => r.date === selectedDate && !r.done);
  }, [selectedDate, reminders]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

  const totalActive = stats.todo + stats.inProgress + stats.done + stats.overdue;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const getSegment = (value: number, color: string) => {
    if (value === 0) return null;
    const percentage = value / totalActive;
    const strokeLength = percentage * circumference;
    const strokeDasharray = `${strokeLength} ${circumference}`;
    const rotateAngle = (currentOffset / totalActive) * 360 - 90;
    currentOffset += value;
    
    return (
      <circle 
        key={color}
        className="ring-segment" 
        cx="50" cy="50" r={radius}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={0}
        style={{ 
          stroke: color,
          transform: `rotate(${rotateAngle}deg)`,
          transformOrigin: '50px 50px',
          transition: 'all 0.8s ease-out'
        }}
      />
    );
  };

  return (
    <div className="calendar-view">
      {/* Sub-tab switcher */}
      <div className="calendar-subtabs">
        <button 
          className={`calendar-subtab ${calendarSubTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setCalendarSubTab('calendar')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Calendar
        </button>
        <button 
          className={`calendar-subtab ${calendarSubTab === 'activity' ? 'active' : ''}`}
          onClick={() => setCalendarSubTab('activity')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Activity
        </button>
      </div>

      {calendarSubTab === 'calendar' && (
        <>
          <div className="calendar-card">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={prevMonth}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <h3>{monthName} {year}</h3>
              <button className="calendar-nav-btn" onClick={nextMonth}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <div className="calendar-grid">
              {weekDays.map((d, i) => (
                <div key={i} className="calendar-weekday">{d}</div>
              ))}
              {monthData.map((d, i) => (
                <div 
                  key={i} 
                  className={`calendar-day ${d.day ? '' : 'empty'} ${selectedDate === d.date ? 'selected' : ''} ${d.hasReminders ? 'has-reminders' : ''}`}
                  onClick={() => d.date && setSelectedDate(d.date)}
                >
                  {d.day && (
                    <>
                      <span className="day-number">{d.day}</span>
                      {d.hasReminders && <span className="day-dot" style={{ backgroundColor: `var(--accent-color)` }}></span>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="selected-day-tasks">
            <div className="section-header">
              <h3>{selectedDate ? new Date(selectedDate).toLocaleDateString('default', { day: 'numeric', month: 'short' }) : 'Select a date'}</h3>
            </div>
            
            <div className="tasks-list">
              {selectedDayReminders.length > 0 ? (
                selectedDayReminders.map(r => (
                  <ReminderCard 
                    key={r.id} 
                    reminder={r} 
                    onDelete={setDeleteConfirmId} 
                    onEdit={onEdit} 
                    isPassed={new Date(r.date + 'T' + r.time + ':00').getTime() <= new Date().getTime()} 
                    formatDate={formatDate}
                    formatTimeUntil={formatTimeUntil}
                    accentColor={accentColor}
                    monochromePriority={monochromePriority}
                    hideActions={true}
                  />
                ))
              ) : (
                <div className="tasks-empty">No active reminders for this day</div>
              )}
            </div>
          </div>
        </>
      )}

      {calendarSubTab === 'activity' && (
        <div className="activity-panel">
          {/* Chart Switcher */}
          <div className="chart-switcher-container">
            <div className="chart-switcher">
              <button 
                className={`switcher-btn ${chartType === 'ring' ? 'active' : ''}`}
                onClick={() => setChartType('ring')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
                Ring Chart
              </button>
              <button 
                className={`switcher-btn ${chartType === 'bar' ? 'active' : ''}`}
                onClick={() => setChartType('bar')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                Bar Chart
              </button>
            </div>
          </div>

          {chartType === 'ring' ? (
            /* Multi-segment Progress Ring */
            <div className="activity-ring-card">
              <div className="ring-container">
                <svg className="progress-ring" viewBox="0 0 100 100">
                  <circle className="ring-bg" cx="50" cy="50" r="40" />
                  {totalActive > 0 && (
                    <>
                      {getSegment(stats.done, '#34c759')}
                      {getSegment(stats.inProgress, '#ffcc00')}
                      {getSegment(stats.todo, '#8e8e93')}
                      {getSegment(stats.overdue, '#ff3b30')}
                    </>
                  )}
                </svg>
                <div className="ring-text">
                  <span className="ring-percent">{totalActive}</span>
                  <span className="ring-label">Total</span>
                </div>
              </div>
              <div className="bar-legend" style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
                <div className="legend-item"><span className="legend-dot done"></span>Done</div>
                <div className="legend-item"><span className="legend-dot in-progress"></span>Active</div>
                <div className="legend-item"><span className="legend-dot todo"></span>To Do</div>
                <div className="legend-item"><span className="legend-dot overdue"></span>Overdue</div>
              </div>
            </div>
          ) : (
            /* Beautiful Column Bar Chart */
            <div className="activity-bar-card">
              <div className="bar-chart-container">
                <div className="bar-col">
                  <div className="bar-wrapper">
                    <div 
                      className="bar-fill done" 
                      style={{ height: animateBars ? getBarHeight(stats.done) : '0%' }}
                    >
                      <span className="bar-value">{stats.done}</span>
                    </div>
                  </div>
                  <span className="bar-label">Done</span>
                </div>
                <div className="bar-col">
                  <div className="bar-wrapper">
                    <div 
                      className="bar-fill in-progress" 
                      style={{ height: animateBars ? getBarHeight(stats.inProgress) : '0%' }}
                    >
                      <span className="bar-value">{stats.inProgress}</span>
                    </div>
                  </div>
                  <span className="bar-label">Active</span>
                </div>
                <div className="bar-col">
                  <div className="bar-wrapper">
                    <div 
                      className="bar-fill todo" 
                      style={{ height: animateBars ? getBarHeight(stats.todo) : '0%' }}
                    >
                      <span className="bar-value">{stats.todo}</span>
                    </div>
                  </div>
                  <span className="bar-label">To Do</span>
                </div>
                <div className="bar-col">
                  <div className="bar-wrapper">
                    <div 
                      className="bar-fill overdue" 
                      style={{ height: animateBars ? getBarHeight(stats.overdue) : '0%' }}
                    >
                      <span className="bar-value">{stats.overdue}</span>
                    </div>
                  </div>
                  <span className="bar-label">Overdue</span>
                </div>
              </div>
              <div className="bar-legend" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
                <div className="legend-item"><span className="legend-dot done"></span>Done</div>
                <div className="legend-item"><span className="legend-dot in-progress"></span>Active</div>
                <div className="legend-item"><span className="legend-dot todo"></span>To Do</div>
                <div className="legend-item"><span className="legend-dot overdue"></span>Overdue</div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className={`activity-stats-grid theme-${accentColor}`}>
            <div className="activity-stat-card">
              <div className="activity-stat-icon" style={{ background: 'var(--accent-color-light)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              </div>
              <div className="activity-stat-info">
                <span className="activity-stat-value" style={{ color: 'var(--accent-color)' }}>{stats.totalCreated}</span>
                <span className="activity-stat-label">Total Created</span>
              </div>
            </div>

            <div className="activity-stat-card">
              <div className="activity-stat-icon" style={{ background: 'rgba(142, 142, 147, 0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div className="activity-stat-info">
                <span className="activity-stat-value" style={{ color: '#8e8e93' }}>{stats.todo}</span>
                <span className="activity-stat-label">To Do</span>
              </div>
            </div>

            <div className="activity-stat-card">
              <div className="activity-stat-icon" style={{ background: 'rgba(255, 204, 0, 0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffcc00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
              </div>
              <div className="activity-stat-info">
                <span className="activity-stat-value" style={{ color: '#ffcc00' }}>{stats.inProgress}</span>
                <span className="activity-stat-label">In Progress</span>
              </div>
            </div>

            <div className="activity-stat-card">
              <div className="activity-stat-icon" style={{ background: 'rgba(52, 199, 89, 0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div className="activity-stat-info">
                <span className="activity-stat-value" style={{ color: '#34c759' }}>{stats.done}</span>
                <span className="activity-stat-label">Done</span>
              </div>
            </div>

            <div className="activity-stat-card">
              <div className="activity-stat-icon" style={{ background: 'rgba(255, 59, 48, 0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
              <div className="activity-stat-info">
                <span className="activity-stat-value" style={{ color: '#ff3b30' }}>{stats.overdue}</span>
                <span className="activity-stat-label">Overdue</span>
              </div>
            </div>

            <div className="activity-stat-card">
              <div className="activity-stat-icon" style={{ background: 'rgba(142, 142, 147, 0.15)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </div>
              <div className="activity-stat-info">
                <span className="activity-stat-value" style={{ color: '#8e8e93' }}>{stats.totalDeleted}</span>
                <span className="activity-stat-label">Deleted</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};
