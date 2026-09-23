import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import type { Reminder } from '../types/reminder';
import { config } from '../config';
import './ReminderDetailModal.css';

interface ReminderDetailModalProps {
  reminder: Reminder | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  formatDate?: (d: string) => string;
  formatTimeUntil?: (d: string, t: string) => string;
  monochromePriority?: boolean;
  currentUserId?: number;
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
  monochromePriority = false,
  currentUserId,
}: ReminderDetailModalProps) => {
  const [localStatus, setLocalStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');

  const participantsList = Array.isArray(reminder?.groupParticipants) ? reminder.groupParticipants : [];
  const isGroup = Boolean(participantsList.length > 1);

  // Strict role detection:
  const isFriendTask = Boolean(!isGroup && (reminder?.assignedTo || reminder?.assignedToChatId));
  const isSentToMe = Boolean(reminder?.isSentToMe || (currentUserId && reminder?.assignedToChatId === currentUserId));
  const isPersonal = Boolean(!reminder?.assignedTo && !reminder?.assignedToChatId && !isGroup);
  const isCreatorOfFriendTask = Boolean(isFriendTask && !isSentToMe);

  const myParticipant = isGroup
    ? (participantsList.find(p => p && p.isMe) || (currentUserId ? participantsList.find(p => p && p.userId === currentUserId) : null) || null)
    : null;

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Sync local status when reminder prop updates
  useEffect(() => {
    if (reminder) {
      const activeStatus = myParticipant
        ? (myParticipant.done || myParticipant.status === 'done' ? 'done' : myParticipant.status === 'in_progress' ? 'in_progress' : 'todo')
        : (reminder.done || reminder.status === 'done' ? 'done' : reminder.status === 'in_progress' ? 'in_progress' : 'todo');
      setLocalStatus(activeStatus);
    }
  }, [reminder, myParticipant]);

  if (!isOpen || !reminder) return null;

  // STRICT RULE:
  // - Creator of friend reminder CANNOT take task or change status for friend
  // - Only the assignee (isSentToMe), personal owner (isPersonal), or group member for their part can change status
  const canChangeStatus = !isCreatorOfFriendTask && (isPersonal || isSentToMe || (isGroup && !!myParticipant));
  const myTargetId = myParticipant?.id || reminder.id;


  const isMyDone = localStatus === 'done';
  const isMyProgress = localStatus === 'in_progress';

  const isOverallDone = localStatus === 'done' || reminder.done || reminder.status === 'done';
  const isOverallInProgress = localStatus === 'in_progress' || reminder.status === 'in_progress';

  let isOverdue = false;
  if (!isOverallDone && reminder.date && reminder.time) {
    try {
      const t = new Date(`${reminder.date}T${reminder.time}:00`).getTime();
      isOverdue = !isNaN(t) && t <= Date.now();
    } catch {
      isOverdue = false;
    }
  }

  const doneCount = isGroup
    ? participantsList.filter(p => p && (p.done || p.status === 'done')).length
    : (isOverallDone ? 1 : 0);
  const totalCount = isGroup ? Math.max(1, participantsList.length) : 1;

  let formattedDateStr = reminder.date || '';
  if (formatDate && reminder.date) {
    try {
      formattedDateStr = formatDate(reminder.date);
    } catch {
      formattedDateStr = reminder.date;
    }
  }

  let formattedTimingStr = '';
  if (formatTimeUntil && reminder.date && reminder.time) {
    try {
      formattedTimingStr = formatTimeUntil(reminder.date, reminder.time);
    } catch {
      formattedTimingStr = `${reminder.date} ${reminder.time}`;
    }
  }

  const priorityLower = reminder.priority ? String(reminder.priority).toLowerCase() : '';
  const repeatLower = reminder.repeat && reminder.repeat !== 'NONE' ? String(reminder.repeat).toLowerCase() : '';

  const handleToggleComplete = () => {
    if (!onStatusChange || !canChangeStatus) return;
    if (isMyDone) {
      setLocalStatus('todo');
      onStatusChange(myTargetId, 'todo');
    } else {
      setLocalStatus('done');
      onStatusChange(myTargetId, 'done');
    }
  };

  const handleToggleInProgress = () => {
    if (!onStatusChange || !canChangeStatus) return;
    if (isMyProgress) {
      setLocalStatus('todo');
      onStatusChange(myTargetId, 'todo');
    } else {
      setLocalStatus('in_progress');
      onStatusChange(myTargetId, 'in_progress');
    }
  };

  const handleEditClick = () => {
    if (isMyProgress || isOverallDone) return;
    onEdit(reminder);
    onClose();
  };

  const handleDeleteClick = () => {
    onDelete(myTargetId);
    onClose();
  };


  return createPortal(
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-sheet-drag-handle"></div>

        {/* Header */}
        <div className="detail-modal-header">
          <div className="detail-status-tag-wrap">
            {isGroup ? (
              <span className="detail-status-pill group">
                👥 Group · {doneCount}/{totalCount} Done
              </span>
            ) : isOverallDone ? (
              <span className="detail-status-pill done">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Completed</span>
              </span>
            ) : isOverallInProgress ? (
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
                <span>To Do</span>
              </span>
            )}

            {priorityLower && (
              <span className={`detail-priority-pill ${priorityLower} ${monochromePriority ? `mono-${priorityLower}` : ''}`}>
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
            <h2 className={`detail-reminder-title ${isOverallDone ? 'is-done' : ''}`}>
              {reminder.text || 'Reminder'}
            </h2>
          </div>

          {/* Group Collaborative Participants Section */}
          {isGroup && participantsList.length > 0 && (
            <div className="detail-card-section group-detail-section">
              <div className="group-detail-header">
                <div className="group-detail-title-wrap">
                  <span className="group-detail-title">Participants & Progress</span>
                  <span className="group-detail-progress-label">{doneCount} of {totalCount} ready</span>
                </div>
                <div className="card-group-progress-track">
                  <div
                    className="card-group-progress-fill"
                    style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="group-detail-members-list">
                {participantsList.map(p => {
                  if (!p) return null;
                  const pStatus = p.done || p.status === 'done' ? 'done' : p.status === 'in_progress' ? 'in_progress' : 'todo';
                  const statusLabel = pStatus === 'done' ? 'Done' : pStatus === 'in_progress' ? 'In Progress' : 'To Do';
                  const statusColorClass = pStatus === 'done' ? 'member-done' : pStatus === 'in_progress' ? 'member-progress' : 'member-todo';
                  const pName = p.name || 'Friend';
                  const initial = String(pName).charAt(0).toUpperCase() || 'F';

                  return (
                    <div key={p.id || Math.random().toString()} className={`group-member-item ${p.isMe ? 'is-me-item' : ''}`}>
                      <div className="group-member-avatar">
                        {p.userId ? (
                          <img
                            src={`${config.backendUrl}/api/avatar?userId=${p.userId}&name=${encodeURIComponent(pName)}`}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerText = initial;
                            }}
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>
                      <div className="group-member-info">
                        <span className="group-member-name">
                          {pName} {p.isMe && <span className="member-you-badge">(You)</span>}
                        </span>
                        {p.username && <span className="group-member-username">@{String(p.username).replace(/^@/, '')}</span>}
                      </div>
                      <span className={`group-member-status-badge ${statusColorClass}`}>
                        {pStatus === 'done' && '✓ '}
                        {pStatus === 'in_progress' && '⏳ '}
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                <span className="detail-info-value">{formattedDateStr} at {reminder.time || ''}</span>
              </div>
            </div>

            {formattedTimingStr && (
              <div className="detail-info-item">
                <div className="detail-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="detail-info-text">
                  <span className="detail-info-label">Timing</span>
                  <span className="detail-info-value">{formattedTimingStr}</span>
                </div>
              </div>
            )}

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

            {repeatLower && (
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
                  <span className="detail-info-value">{repeatLower}</span>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Friend Card (if single friend reminder) */}
          {!isGroup && (reminder.assignedTo || reminder.assignedToChatId || reminder.isSentToMe) && (
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
                  {reminder.isSentToMe ? 'You can update your task status below' : 'Recipient will update their status directly'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="detail-modal-actions">
          {/* If user is the assignee or group member: show interactive status buttons */}
          {canChangeStatus ? (
            isMyDone ? (
              <button
                type="button"
                className="detail-action-btn primary reopen"
                onClick={handleToggleComplete}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                <span>Reopen My Task</span>
              </button>
            ) : isMyProgress ? (
              <>
                <button
                  type="button"
                  className="detail-action-btn primary complete"
                  onClick={handleToggleComplete}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Done</span>
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
                onClick={handleToggleInProgress}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Start In Progress (Take task)</span>
              </button>
            )

          ) : (
            /* If user is the creator viewing a friend's task */
            <div className="detail-creator-notice">
              <span className="notice-icon">ℹ️</span>
              <span>{isGroup ? 'Group tracking view · Members update their own status' : `Assigned to ${reminder.assignedTo} · Status updates live`}</span>
            </div>
          )}

          <div className="detail-sub-actions-row">
            {/* Edit Button (hidden when in progress or for assigned tasks) */}
            {canChangeStatus && !isMyDone && !isMyProgress && !isGroup && (
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
              title="Delete or cancel reminder"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>{canChangeStatus && isGroup ? 'Remove My Part' : 'Cancel / Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};


