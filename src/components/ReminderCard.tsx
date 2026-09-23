import React from 'react';
import type { Reminder } from '../types/reminder';
import { config } from '../config';

interface ReminderCardProps {
  reminder: Reminder;
  onDelete: (id: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onStatusChange?: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  isPassed?: boolean;
  formatDate?: (d: string) => string;
  formatTimeUntil?: (d: string, t: string) => string;
  accentColor?: string;
  monochromePriority?: boolean;
  hideActions?: boolean;
  currentUserId?: number;
}

export const ReminderCard = ({
  reminder,
  onDelete,
  onEdit,
  onStatusChange,
  isPassed = false,
  monochromePriority = false,
  hideActions = false,
  formatTimeUntil,
  currentUserId,
}: ReminderCardProps) => {
  if (!reminder) return null;

  const participantsList = Array.isArray(reminder.groupParticipants) ? reminder.groupParticipants : [];
  const isGroup = Boolean(participantsList.length > 1);

  // Strict role detection:
  // Is current user the creator of a single-friend reminder?
  const isFriendTask = Boolean(!isGroup && (reminder.assignedTo || reminder.assignedToChatId));
  const isSentToMe = Boolean(reminder.isSentToMe || (currentUserId && reminder.assignedToChatId === currentUserId));
  const isPersonal = Boolean(!reminder.assignedTo && !reminder.assignedToChatId && !isGroup);
  
  const isCreatorOfFriendTask = Boolean(isFriendTask && !isSentToMe);

  const myParticipant = isGroup
    ? (participantsList.find(p => p && p.isMe) || (currentUserId ? participantsList.find(p => p && p.userId === currentUserId) : null) || null)
    : null;

  // STRICT RULE:
  // - Creator of friend reminder CANNOT take task or change status for friend
  // - Only the assignee (isSentToMe), personal owner (isPersonal), or group member for their part can change status
  const canChangeStatus = !isCreatorOfFriendTask && (isPersonal || isSentToMe || (isGroup && !!myParticipant));

  const isMyDone = myParticipant ? (myParticipant.done || myParticipant.status === 'done') : (reminder.done || reminder.status === 'done');
  const isMyProgress = myParticipant ? (myParticipant.status === 'in_progress') : (reminder.status === 'in_progress');
  const myTargetId = myParticipant?.id || reminder.id;

  const isOverallDone = reminder.done || reminder.status === 'done';
  const isOverallInProgress = reminder.status === 'in_progress';

  const doneCount = isGroup
    ? participantsList.filter(p => p && (p.done || p.status === 'done')).length
    : (isOverallDone ? 1 : 0);
  const totalCount = isGroup ? Math.max(1, participantsList.length) : 1;

  // Circle click: todo → in_progress, in_progress → done (updates current user's status)
  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange || !canChangeStatus) return;
    if (isMyDone) {
      onStatusChange(myTargetId, 'todo');
    } else if (isMyProgress) {
      onStatusChange(myTargetId, 'done');
    } else {
      onStatusChange(myTargetId, 'in_progress');
    }
  };

  // Toggle in-progress
  const handleToggleInProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange || !canChangeStatus) return;
    if (isMyProgress) {
      onStatusChange(myTargetId, 'todo');
    } else {
      onStatusChange(myTargetId, 'in_progress');
    }
  };

  const handleCardClick = () => {
    if (onEdit) onEdit(reminder);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMyProgress || isOverallDone) return;
    if (onEdit) onEdit(reminder);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(myTargetId);
  };

  const getSubtext = () => {
    if (isGroup) {
      return `${totalCount} participants`;
    }
    if (reminder.isSentToMe) {
      return `From ${reminder.creatorName || 'Friend'}`;
    }
    if (reminder.assignedTo) {
      return `For ${String(reminder.assignedTo).replace(/^@/, '')}`;
    }
    if (reminder.category) {
      return reminder.category;
    }
    return 'Personal';
  };

  const priorityLower = reminder.priority ? String(reminder.priority).toLowerCase() : '';
  const repeatLower = reminder.repeat && reminder.repeat !== 'NONE' ? String(reminder.repeat).toLowerCase() : '';

  let timingText = `${reminder.date || ''} ${reminder.time || ''}`.trim();
  if (formatTimeUntil && reminder.date && reminder.time) {
    try {
      timingText = formatTimeUntil(reminder.date, reminder.time);
    } catch {
      timingText = `${reminder.date} ${reminder.time}`;
    }
  }

  const isHighPriority = priorityLower === 'high';
  const isMedPriority = priorityLower === 'medium';
  const isLowPriority = priorityLower === 'low';

  return (
    <div
      className={`reminder-row-card animate-card-appear ${isOverallDone ? 'is-done' : ''} ${isPassed && !isOverallDone ? 'is-overdue' : ''} ${isMyProgress || isOverallInProgress ? 'is-in-progress' : ''} ${isHighPriority && !isOverallDone ? 'is-high-priority' : ''} ${isGroup ? 'is-group-card' : ''} ${isCreatorOfFriendTask ? 'is-observer-card' : ''}`}
      onClick={handleCardClick}
    >
      {/* Left Status Circle / Observer Badge */}
      {canChangeStatus ? (
        <button
          type="button"
          className={`status-circle-btn ${isMyDone ? 'checked' : ''} ${isMyProgress ? 'in-progress' : ''}`}
          onClick={handleToggleStatus}
          aria-label={isMyDone ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isMyDone ? (
            <div className="status-checked-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" className="check-svg-path"></polyline>
              </svg>
            </div>
          ) : isMyProgress ? (
            <div className="status-in-progress-ring">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" strokeDasharray="14 6" className="spinning-ring"></circle>
              </svg>
            </div>
          ) : (
            <span className="circle-outline"></span>
          )}
        </button>
      ) : (
        /* Observer/Creator View: displays live status of friend without acting like a clickable checkbox */
        <div className="observer-status-badge-wrap" title={isOverallDone ? 'Friend completed' : isOverallInProgress ? 'Friend in progress' : 'Waiting for friend'}>
          {isOverallDone ? (
            <div className="observer-badge done">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          ) : isOverallInProgress ? (
            <div className="observer-badge in-progress">
              <span className="observer-pulse-dot" />
            </div>
          ) : (
            <div className="observer-badge pending">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Middle Content */}
      <div className="reminder-row-content">
        <div className="reminder-row-top">
          <span className={`reminder-row-title ${isOverallDone ? 'is-done' : ''}`}>
            {reminder.text || 'Reminder'}
          </span>

          {/* Clean Priority Badge with colored dot */}
          {isHighPriority && (
            <span className={`card-priority-badge high ${monochromePriority ? 'mono-high' : ''}`}>
              <span className="prio-dot">●</span>
              <span>High</span>
            </span>
          )}
          {isMedPriority && (
            <span className={`card-priority-badge medium ${monochromePriority ? 'mono-medium' : ''}`}>
              <span className="prio-dot">●</span>
              <span>Medium</span>
            </span>
          )}
          {isLowPriority && (
            <span className={`card-priority-badge low ${monochromePriority ? 'mono-low' : ''}`}>
              <span className="prio-dot">●</span>
              <span>Low</span>
            </span>
          )}
        </div>


        {/* Group collaborative progress bar */}
        {isGroup && participantsList.length > 0 && (
          <div className="card-group-progress-wrap">
            <div className="card-group-progress-info">
              <span className="card-group-progress-text">
                {doneCount === totalCount ? 'All ready 🎉' : `${doneCount} of ${totalCount} ready`}
              </span>
              <span className="card-group-progress-pct">{Math.round((doneCount / totalCount) * 100)}%</span>
            </div>
            <div className="card-group-progress-track">
              <div
                className="card-group-progress-fill"
                style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
              />
            </div>
            {/* Participants live status chips */}
            <div className="card-participants-chips">
              {participantsList.map(p => {
                if (!p) return null;
                const pStatus = p.done || p.status === 'done' ? 'done' : p.status === 'in_progress' ? 'in_progress' : 'todo';
                const statusLabel = pStatus === 'done' ? 'Done' : pStatus === 'in_progress' ? 'Doing' : 'To Do';
                const pName = p.name || 'Friend';
                const shortName = String(pName).split(' ')[0] || 'Friend';
                return (
                  <span key={p.id || Math.random().toString()} className={`participant-chip ${pStatus}`}>
                    {p.isMe ? 'You' : shortName}: {statusLabel}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="reminder-row-bottom">
          {/* Scheduled Time Pill */}
          <span className="reminder-pill time-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="pill-time-val">{reminder.time || '12:00'}</span>
          </span>

          {/* Overdue Badge */}
          {isPassed && !isOverallDone && (
            <span className="reminder-pill overdue-pill">
              Overdue
            </span>
          )}

          {/* In-Progress Badge */}
          {(isMyProgress || isOverallInProgress) && !isOverallDone && (
            <span className="reminder-pill in-progress-pill">
              <span className="in-progress-dot"></span>
              In Progress
            </span>
          )}

          {/* Scope / Contact Subtext */}
          <span className="reminder-pill subtext-pill">
            {isGroup ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            )}
            <span>{getSubtext()}</span>
          </span>

          {/* Repeat Pill */}
          {repeatLower && (
            <span className="reminder-pill repeat-pill">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span>{repeatLower}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Subtle Open Chevron */}
      <div className="card-open-chevron" title="Open details">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  );
};



