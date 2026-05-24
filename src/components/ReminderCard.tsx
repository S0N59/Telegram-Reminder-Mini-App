import { Reminder } from '../types/reminder';

interface ReminderCardProps {
  reminder: Reminder;
  onDelete: (id: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onStatusChange?: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  isPassed: boolean;
  formatDate: (d: string) => string;
  formatTimeUntil: (d: string, t: string) => string;
  accentColor: string;
  monochromePriority: boolean;
  hideActions?: boolean;
}

export const ReminderCard = ({ 
  reminder, 
  onDelete, 
  onEdit,
  onStatusChange,
  isPassed, 
  formatDate, 
  formatTimeUntil,
  accentColor,
  monochromePriority,
  hideActions
}: ReminderCardProps) => {
  return (
    <div className={`reminder-card-container ${isPassed ? 'passed-reminder' : ''} ${reminder.isSentToMe ? 'sent-to-me-reminder' : ''} theme-${accentColor}`}>
      <div className="reminder-card">
        <div className="reminder-main">
          <div className="reminder-icon-circle">
            {isPassed ? (
              <svg className="icon-clock" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ) : (
              <svg className="icon-bell" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            )}
          </div>
          <div className="reminder-info">
            <div className="reminder-text">{reminder.text}</div>
            <div className="reminder-details">
              <div className="detail-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {formatDate(reminder.date)}
              </div>
              <div className="detail-item time">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {reminder.time}
              </div>
              {!isPassed && (
                <div className="detail-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {formatTimeUntil(reminder.date, reminder.time)}
                </div>
              )}
            </div>
          </div>
          {hideActions && (
            <div className="reminder-priority-inline">
              <span className={`reminder-badge ${monochromePriority ? 'priority-mono' : `priority-${(reminder.priority || 'MEDIUM').toLowerCase()}`}`}>
                {reminder.priority === 'HIGH' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                )}
                {reminder.priority === 'MEDIUM' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                )}
                {reminder.priority === 'LOW' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                )}
                {reminder.priority || 'Medium'}
              </span>
            </div>
          )}
        </div>
        
        {!hideActions && (
          <div className="reminder-footer">
            <div className="reminder-badges">
              {reminder.priority === 'HIGH' && (
                <span className={`reminder-badge ${monochromePriority ? 'priority-mono' : 'priority-high'}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  High
                </span>
              )}
              {reminder.priority === 'MEDIUM' && (
                <span className={`reminder-badge ${monochromePriority ? 'priority-mono' : 'priority-medium'}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Medium
                </span>
              )}
              {reminder.priority === 'LOW' && (
                <span className={`reminder-badge ${monochromePriority ? 'priority-mono' : 'priority-low'}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  Low
                </span>
              )}
              {reminder.category && (
                <span className="reminder-badge category">
                  {reminder.category}
                </span>
              )}
              {reminder.isSentToMe ? (
                <span className="reminder-badge assign from-creator">
                  📨 From: {reminder.creatorName || 'Someone'}
                </span>
              ) : reminder.assignedTo ? (
                <span className="reminder-badge assign sent-to">
                  📤 Sent to: {reminder.assignedTo.replace(/^@/, '')}
                </span>
              ) : null}
            </div>
            
            <div className="reminder-actions">
              {onEdit && (
                <button 
                  className="action-btn edit" 
                  onClick={(e) => { e.stopPropagation(); onEdit(reminder); }}
                  aria-label="Edit"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
              )}
              {onStatusChange && (!reminder.status || reminder.status === 'todo') && (
                <button 
                  className="action-btn status status-in-progress" 
                  onClick={(e) => { e.stopPropagation(); onStatusChange(reminder.id, 'in_progress'); }}
                  aria-label="Mark In Progress"
                  style={{ color: '#ffcc00' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
              )}
              {onStatusChange && reminder.status === 'in_progress' && (
                <button 
                  className="action-btn status status-done" 
                  onClick={(e) => { e.stopPropagation(); onStatusChange(reminder.id, 'done'); }}
                  aria-label="Mark Done"
                  style={{ color: '#34c759' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              )}
              <button 
                className="action-btn delete" 
                onClick={(e) => { e.stopPropagation(); onDelete(reminder.id); }}
                aria-label="Delete"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
