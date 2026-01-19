import type { Reminder } from '../types/reminder';
import type { Language } from '../i18n';
import './ReminderList.css';

interface ReminderListProps {
  reminders: Reminder[];
  onDelete: (id: string) => void;
  language: Language;
  strings: {
    nextReminderTitle: string;
    allRemindersTitle: string;
    emptyTitle: string;
    emptyHint: string;
    deleteAria: string;
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

export const ReminderList = ({ reminders, onDelete, strings }: ReminderListProps) => {
  // Find next reminder from the list
  const nextReminder = reminders
    .filter(r => !r.done)
    .sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.time + ':00').getTime();
      const dateB = new Date(b.date + 'T' + b.time + ':00').getTime();
      return dateA - dateB;
    })[0] || null;

  if (reminders.length === 0) {
    return (
      <div className="reminder-list empty">
        <div className="empty-state">
          <div className="empty-icon">📭</div>
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

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return strings.todayLabel;
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return strings.tomorrowLabel;
    } else {
      return `${strings.daysShort[date.getDay()]}, ${date.getDate()} ${strings.monthsShort[date.getMonth()]}`;
    }
  };

  const formatTimeUntil = (date: string, time: string): string => {
    const now = new Date();
    const reminderDate = new Date(date + 'T' + time + ':00');
    const diff = reminderDate.getTime() - now.getTime();

    if (diff < 0) {
      return strings.passedLabel;
    }

    const daysUntil = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (daysUntil > 0) {
      return strings.inDaysHours(daysUntil, hoursUntil);
    } else if (hoursUntil > 0) {
      return strings.inHoursMinutes(hoursUntil, minutesUntil);
    }
    return strings.inMinutes(minutesUntil);
  };

  return (
    <div className="reminder-list">
      {nextReminder && (
        <div className="next-reminder-banner">
          <span className="banner-icon">⏳</span>
          <div className="banner-content">
            <div className="banner-title">{strings.nextReminderTitle}</div>
            <div className="banner-text">{nextReminder.text}</div>
            <div className="banner-time">{formatDate(nextReminder.date)} • {nextReminder.time} • {formatTimeUntil(nextReminder.date, nextReminder.time)}</div>
          </div>
        </div>
      )}

      <div className="reminders-header">
        <h3>{strings.allRemindersTitle} ({reminders.length})</h3>
      </div>

      <div className="reminders-grid">
        {reminders
          .sort((a, b) => {
            const dateA = new Date(a.date + 'T' + a.time + ':00').getTime();
            const dateB = new Date(b.date + 'T' + b.time + ':00').getTime();
            return dateA - dateB;
          })
          .map(reminder => (
          <div key={reminder.id} className="reminder-card">
            <div className="reminder-card-content">
              <div className="reminder-icon">🔔</div>
              <div className="reminder-text">{reminder.text}</div>
              <div className="reminder-date-time">
                <div className="reminder-date">
                  <span className="date-icon">📅</span>
                  {formatDate(reminder.date)}
                </div>
                <div className="reminder-time">
                  <span className="time-icon">⏰</span>
                  {reminder.time}
                </div>
              </div>
            </div>
            {(reminder.priority || reminder.repeat) && (
              <div className="reminder-meta">
                {reminder.priority && (
                  <span className={`reminder-priority priority-${reminder.priority.toLowerCase()}`}>
                    {reminder.priority === 'HIGH' ? '🚨' : reminder.priority === 'LOW' ? '🔕' : '🔔'} {reminder.priority}
                  </span>
                )}
                {reminder.repeat && reminder.repeat !== 'NONE' && (
                  <span className="reminder-repeat">
                    🔁 {reminder.repeat}
                  </span>
                )}
              </div>
            )}
            <div className="reminder-actions">
              <button
                className="reminder-delete"
                onClick={() => onDelete(reminder.id)}
                aria-label={strings.deleteAria}
              >
                <span className="delete-icon">🗑️</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
