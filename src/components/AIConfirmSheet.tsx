import { motion, AnimatePresence } from 'framer-motion';
import type { AIReminderIntent } from '../utils/aiParser';
import type { ReminderFormData } from '../types/reminder';
import type { BotContact } from '../utils/reminderStorage';
import { parseAIResponse } from '../utils/aiParser';
import './AIConfirmSheet.css';

interface AIConfirmSheetProps {
  intent: AIReminderIntent | null;
  contacts: BotContact[];
  currentUserId?: number;
  onConfirm: (reminders: ReminderFormData[]) => void;
  onEdit: (prefilled: ReminderFormData) => void;
  onClose: () => void;
}

function formatDateDisplay(dateStr: string): string {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const tom = new Date(now); tom.setDate(tom.getDate()+1);
  const tomorrow = `${tom.getFullYear()}-${String(tom.getMonth()+1).padStart(2,'0')}-${String(tom.getDate()).padStart(2,'0')}`;
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  try {
    const [y,m,d] = dateStr.split('-').map(Number);
    return new Date(y, m-1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function formatTimeDisplay(hours: string, minutes: string): string {
  return `${hours}:${minutes}`;
}

export const AIConfirmSheet = ({
  intent,
  contacts,
  currentUserId,
  onConfirm,
  onEdit,
  onClose,
}: AIConfirmSheetProps) => {
  if (!intent) return null;

  const parsed = parseAIResponse(intent, contacts, currentUserId);
  const { reminders, unresolved, missingFields } = parsed;

  const handleConfirmAll = () => {
    onConfirm(reminders);
  };

  const handleEditFirst = () => {
    if (reminders.length > 0) {
      onEdit(reminders[0]);
    }
  };

  return (
    <AnimatePresence>
      {intent && (
        <>
          {/* Backdrop */}
          <motion.div
            className="ai-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="ai-confirm-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.85 }}
          >
            {/* Handle */}
            <div className="ai-sheet-handle" />

            {/* Header */}
            <div className="ai-sheet-header">
              <div className="ai-sheet-title">
                <div className="ai-sheet-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  AI
                </div>
                <span>I understood it like this:</span>
              </div>
              <button type="button" className="ai-sheet-close" onClick={onClose} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Tasks list */}
            <div className="ai-sheet-tasks">
              {reminders.map((r, i) => (
                <div key={i} className="ai-task-card">
                  <div className="ai-task-number">{i + 1}</div>
                  <div className="ai-task-body">
                    <div className="ai-task-text">{r.text}</div>
                    <div className="ai-task-meta">
                      <span className="ai-task-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {formatDateDisplay(r.date)}
                      </span>
                      <span className="ai-task-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {formatTimeDisplay(r.hours, r.minutes)}
                        {missingFields.includes('time') && (
                          <span className="ai-task-inferred"> (default)</span>
                        )}
                      </span>
                      {r.recipients && r.recipients.length > 0 && (
                        <span className="ai-task-meta-item ai-task-recipients">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          You + {r.recipients.map(rec => rec.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {unresolved.length > 0 && (
              <div className="ai-sheet-warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>Not found in contacts: <strong>{unresolved.join(', ')}</strong>. Reminder will be created for you only.</span>
              </div>
            )}

            {missingFields.includes('date') && (
              <div className="ai-sheet-warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Date wasn't specified — set to today. Tap "Edit" to change.</span>
              </div>
            )}

            {/* Actions */}
            <div className="ai-sheet-actions">
              {reminders.length === 1 && (
                <button type="button" className="ai-sheet-btn ai-sheet-btn-secondary" onClick={handleEditFirst}>
                  Edit
                </button>
              )}
              <button
                type="button"
                className="ai-sheet-btn ai-sheet-btn-primary"
                onClick={handleConfirmAll}
                disabled={reminders.length === 0}
              >
                {reminders.length === 1
                  ? 'Create reminder'
                  : `Create (${reminders.length})`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
