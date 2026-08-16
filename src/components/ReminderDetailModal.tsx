import { useState, useEffect } from 'react';
import { Reminder } from '../types/reminder';
import { config } from '../config';
import './ReminderDetailModal.css';

interface ReminderDetailModalProps {
  reminder: Reminder | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  formatDate: (d: string) => string;
  formatTimeUntil: (d: string, t: string) => string;
  monochromePriority: boolean;
}

export const ReminderDetailModal = ({
  reminder,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  formatDate,
  formatTimeUntil,
  monochromePriority,
}: ReminderDetailModalProps) => {
  const [localStatus, setLocalStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');

  useEffect(() => {
    if (reminder) {
      setLocalStatus(reminder.done ? 'done' : (reminder.status || 'todo'));
    }
  }, [reminder]);

  if (!isOpen || !reminder) return null;

  const isDone = localStatus === 'done';
  const isInProgress = localStatus === 'in_progress';
  const isOverdue = !isDone && new Date(`${reminder.date}T${reminder.time}:00`).getTime() <= Date.now();

  const handleToggleComplete = () => {
    if (!onStatusChange) return;
    if (isDone) {
      setLocalStatus('todo');
      onStatusChange(reminder.id, 'todo');
    } else if (isInProgress) {
      setLocalStatus('done');
      onStatusChange(reminder.id, 'done');
      onClose();
    } else {
      setLocalStatus('in_progress');
      onStatusChange(reminder.id, 'in_progress');
    }
  };

  const handleToggleInProgress = () => {
    if (!onStatusChange) return;
    if (isInProgress) {
      setLocalStatus('todo');
      onStatusChange(reminder.id, 'todo');
    } else {
      setLocalStatus('in_progress');
      onStatusChange(reminder.id, 'in_progress');
    }
  };

  const handleEditClick = () => {
    if (isInProgress || isDone) return;
    onEdit(reminder);
    onClose();
  };

  const handleDeleteClick = () => {
    onDelete(reminder.id);
    onClose();
  };

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-sheet-drag-handle"></div>

        {/* Header */}
        <div className="detail-modal-header">
          <div className="detail-status-tag-wrap">
            {isDone ? (
              <span className="detail-status-pill done">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Completed</span>
              </span>
            ) : isInProgress ? (
              <span className="detail-status-pill in-progress">
                <span className="status-pulse-dot"></span>
                <span>In Progress</span>
              </span>
            ) : isOverdue ? (
              <span className="detail-status-pill overdue">
                <span>Overdue</span>
              </span>
            ) : (
              <span className="detail-status-pill todo">
                <span>Pending</span>
              </span>
            )}

            {reminder.priority && (
              <span className={`detail-priority-pill ${reminder.priority.toLowerCase()} ${monochromePriority ? `mono-${reminder.priority.toLowerCase()}` : ''}`}>
                {reminder.priority} Priority
              </span>
            )}
          </div>

          <button type="button" className="detail-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="detail-modal-body">
          {/* Main Title */}
          <div className="detail-card-section">
            <h2 className={`detail-reminder-title ${isDone ? 'is-done' : ''}`}>
              {reminder.text}
            </h2>
          </div>

          {/* Time & Schedule Details */}
          <div className="detail-card-section info-grid">
            <div className="detail-info-item">
              <div className="detail-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className="detail-info-text">
                <span className="detail-info-label">Date & Time</span>
                <span className="detail-info-value">{formatDate(reminder.date)} at {reminder.time}</span>
              </div>
            </div>

            <div className="detail-info-item">
              <div className="detail-info-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="detail-info-text">
                <span className="detail-info-label">Timing</span>
                <span className="detail-info-value">{formatTimeUntil(reminder.date, reminder.time)}</span>
              </div>
            </div>

            {reminder.category && (
              <div className="detail-info-item">
                <div className="detail-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                </div>
                <div className="detail-info-text">
                  <span className="detail-info-label">Category</span>
                  <span className="detail-info-value">{reminder.category}</span>
                </div>
              </div>
            )}

            {reminder.repeat && reminder.repeat !== 'NONE' && (
              <div className="detail-info-item">
                <div className="detail-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                </div>
                <div className="detail-info-text">
                  <span className="detail-info-label">Repeat</span>
                  <span className="detail-info-value">{reminder.repeat.toLowerCase()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Friend Card (if applicable) */}
          {(reminder.assignedTo || reminder.assignedToChatId || reminder.isSentToMe) && (
            <div className="detail-card-section friend-card">
              <div className="detail-friend-avatar">
                {reminder.assignedToChatId ? (
                  <img
                    src={`${config.backendUrl}/api/avatar?userId=${reminder.assignedToChatId}&name=${encodeURIComponent(reminder.assignedTo || reminder.creatorName || 'Friend')}`}
                    alt="Friend"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerText = (reminder.assignedTo || 'F').charAt(0).toUpperCase();
                    }}
                  />
                ) : (
                  <span>{(reminder.assignedTo || reminder.creatorName || 'F').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="detail-friend-info">
                <span className="detail-friend-name">
                  {reminder.isSentToMe ? `From ${reminder.creatorName || 'Friend'}` : `Assigned to ${reminder.assignedTo}`}
                </span>
                <span className="detail-friend-hint">
                  {reminder.isSentToMe ? 'Received reminder' : 'Notification will be sent to friend'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="detail-modal-actions">
          {/* Primary Action Button - depends on current state */}
          {isDone ? (
            <button
              type="button"
              className="detail-action-btn primary reopen"
              onClick={handleToggleComplete}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
              <span>Reopen Reminder</span>
            </button>
          ) : isInProgress ? (
            <>
              <button
                type="button"
                className="detail-action-btn primary complete"
                onClick={handleToggleComplete}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Mark as Done</span>
              </button>
              <button
                type="button"
                className="detail-action-btn progress active"
                onClick={handleToggleInProgress}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
                <span>Pause Progress</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="detail-action-btn progress"
              onClick={handleToggleComplete}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>Start In Progress</span>
            </button>
          )}

          <div className="detail-sub-actions-row">
            {/* Edit Button (hidden when in progress) */}
            {!isDone && !isInProgress && (
              <button
                type="button"
                className="detail-sub-action-btn edit"
                onClick={handleEditClick}
                title="Edit reminder"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
            )}

            {/* Delete Button */}
            <button
              type="button"
              className="detail-sub-action-btn delete"
              onClick={handleDeleteClick}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
