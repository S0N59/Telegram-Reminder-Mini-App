import { Reminder } from '../types/reminder';
import { config } from '../config';

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
  monochromePriority,
  hideActions
}: ReminderCardProps) => {
  const isDone = reminder.done || reminder.status === 'done';
  const isInProgress = reminder.status === 'in_progress';

  // Circle click: todo → in_progress, in_progress → done
  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    if (isDone) {
      onStatusChange(reminder.id, 'todo');
    } else if (isInProgress) {
      onStatusChange(reminder.id, 'done');
    } else {
      onStatusChange(reminder.id, 'in_progress');
    }
  };

  // Toggle in-progress
  const handleToggleInProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    if (isInProgress) {
      onStatusChange(reminder.id, 'todo');
    } else {
      onStatusChange(reminder.id, 'in_progress');
    }
  };

  // Edit is disabled when in progress
  const handleCardClick = () => {
    if (onEdit) onEdit(reminder);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInProgress || isDone) return;
    if (onEdit) onEdit(reminder);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(reminder.id);
  };

  const getSubtext = () => {
    if (reminder.isSentToMe) {
      return `From ${reminder.creatorName || 'Friend'}`;
    }
    if (reminder.assignedTo) {
      return `For ${reminder.assignedTo.replace(/^@/, '')}`;
    }
    if (reminder.category) {
      return reminder.category;
    }
    return 'Personal';
  };

  return (
    <div
      className={`reminder-row-card animate-card-appear ${isDone ? 'is-done' : ''} ${isPassed && !isDone ? 'is-overdue' : ''} ${isInProgress ? 'is-in-progress' : ''}`}
      onClick={handleCardClick}
    >
      {/* Left Checkbox Button */}
      <button
        type="button"
        className={`status-circle-btn ${isDone ? 'checked' : ''} ${isInProgress ? 'in-progress' : ''}`}
        onClick={handleToggleStatus}
        aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isDone ? (
          <div className="status-checked-icon animate-pop">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ) : isInProgress ? (
          <div className="status-in-progress-ring">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" strokeDasharray="14 6" className="spinning-ring"></circle>
            </svg>
          </div>
        ) : (
          <span className="circle-outline"></span>
        )}
      </button>

      {/* Middle Content */}
      <div className="reminder-row-content">
        <div className="reminder-row-top">
          <div className="time-badge-wrap">
            <span className="reminder-time-text">{reminder.time}</span>
            {isPassed && !isDone && (
              <span className="overdue-chip">Overdue</span>
            )}
            {isInProgress && (
              <span className="in-progress-chip">In Progress</span>
            )}
            {!isDone && reminder.priority && reminder.priority !== 'LOW' && (
              <span className={`priority-tag-pill ${reminder.priority.toLowerCase()} ${monochromePriority ? `mono-${reminder.priority.toLowerCase()}` : ''}`}>
                {reminder.priority}
              </span>
            )}
          </div>
        </div>

        <div className="reminder-row-title">{reminder.text}</div>

        <div className="reminder-row-bottom">
          {/* Inline Friend Avatar */}
          {(reminder.assignedTo || reminder.isSentToMe) && (
            <div className="card-friend-avatar-sm">
              {reminder.assignedToChatId ? (
                <img
                  src={`${config.backendUrl}/api/avatar?userId=${reminder.assignedToChatId}&name=${encodeURIComponent(reminder.assignedTo || reminder.creatorName || 'Friend')}`}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerText = (reminder.assignedTo || reminder.creatorName || 'F').charAt(0).toUpperCase();
                  }}
                />
              ) : (
                <span>{(reminder.assignedTo || reminder.creatorName || 'F').charAt(0).toUpperCase()}</span>
              )}
            </div>
          )}
          <span className="reminder-row-subtext">{getSubtext()}</span>
          {reminder.category && (
            <span className="category-tag">{reminder.category}</span>
          )}
          {reminder.repeat && reminder.repeat !== 'NONE' && (
            <span className="repeat-tag" title={`Repeats ${reminder.repeat}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span>{reminder.repeat.toLowerCase()}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Action Buttons */}
      {!hideActions && (
        <div className="reminder-actions-toolbar" onClick={(e) => e.stopPropagation()}>
          {/* Complete Button (Done) - only from In Progress */}
          {isInProgress && (
            <button
              type="button"
              className="card-tool-btn done-btn"
              onClick={(e) => { e.stopPropagation(); onStatusChange && onStatusChange(reminder.id, 'done'); }}
              title="Complete reminder"
              aria-label="Complete"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          )}

          {/* Progress Toggle Button */}
          {!isDone && (
            <button
              type="button"
              className={`card-tool-btn progress-btn ${isInProgress ? 'active' : ''}`}
              onClick={handleToggleInProgress}
              title={isInProgress ? "Pause progress" : "Start in progress"}
              aria-label="Toggle Progress"
            >
              {isInProgress ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                  <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>
          )}

          {/* Edit (hidden when in progress or done) */}
          {!isDone && !isInProgress && (
            <button
              type="button"
              className="card-tool-btn edit-btn"
              onClick={handleEditClick}
              title="Edit reminder"
              aria-label="Edit"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          )}

          {/* Delete Button */}
          <button
            type="button"
            className="card-tool-btn delete-btn"
            onClick={handleDeleteClick}
            title="Delete reminder"
            aria-label="Delete"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
