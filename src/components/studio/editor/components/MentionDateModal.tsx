import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Clock, X, Check, Calendar } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';

interface MentionDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertMention: (text: string, link: string) => void;
  onInsertTimestamp: (text: string, timestampUrl: string) => void;
}

export const MentionDateModal: React.FC<MentionDateModalProps> = ({
  isOpen,
  onClose,
  onInsertMention,
  onInsertTimestamp,
}) => {
  const [activeTab, setActiveTab] = useState<'mention' | 'date'>('mention');

  // Mention State
  const [mentionType, setMentionType] = useState<'username' | 'userId'>('username');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [mentionName, setMentionName] = useState('');

  // Date State
  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16);
  });
  const [dateLabel, setDateLabel] = useState('');

  if (!isOpen) return null;

  const handleMentionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mentionType === 'username') {
      const cleanUser = username.trim().replace(/^@/, '');
      if (!cleanUser) return;
      onInsertMention(`@${cleanUser}`, `https://t.me/${cleanUser}`);
    } else {
      const cleanId = userId.trim();
      const name = mentionName.trim() || `User ${cleanId}`;
      if (!cleanId) return;
      onInsertMention(name, `tg://user?id=${cleanId}`);
    }
    onClose();
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(selectedDateTime);
    if (isNaN(dateObj.getTime())) return;
    const unixTimestamp = Math.floor(dateObj.getTime() / 1000);

    const formattedText = dateLabel.trim() || dateObj.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    onInsertTimestamp(formattedText, `tg://timestamp?t=${unixTimestamp}`);
    onClose();
  };

  return (
    <OverlayPortal>
      <AnimatePresence>
        <div className="channel-modal-backdrop" onClick={onClose}>
        <motion.div
          className="channel-modal-content link-modal-content mention-date-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="channel-modal-header">
            <div className="channel-modal-title-row">
              <div className="channel-modal-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                {activeTab === 'mention' ? <AtSign size={18} /> : <Clock size={18} />}
              </div>
              <div>
                <h3 className="channel-modal-title">
                  {activeTab === 'mention' ? 'Telegram Mention' : 'Telegram Timestamp'}
                </h3>
                <p className="channel-modal-sub">
                  {activeTab === 'mention'
                    ? 'Mention a user by username or Telegram ID'
                    : 'Insert an interactive formatted date & time'}
                </p>
              </div>
            </div>
            <button type="button" className="channel-modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="media-type-selector" style={{ marginBottom: '14px' }}>
            <button
              type="button"
              className={`media-type-btn ${activeTab === 'mention' ? 'active' : ''}`}
              onClick={() => setActiveTab('mention')}
            >
              <AtSign size={14} />
              <span>User Mention</span>
            </button>
            <button
              type="button"
              className={`media-type-btn ${activeTab === 'date' ? 'active' : ''}`}
              onClick={() => setActiveTab('date')}
            >
              <Clock size={14} />
              <span>Timestamp</span>
            </button>
          </div>

          {/* Mention Tab */}
          {activeTab === 'mention' && (
            <form onSubmit={handleMentionSubmit} className="link-modal-body">
              <div className="media-type-selector" style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  className={`media-type-btn ${mentionType === 'username' ? 'active' : ''}`}
                  onClick={() => setMentionType('username')}
                >
                  <AtSign size={14} />
                  <span>@Username</span>
                </button>
                <button
                  type="button"
                  className={`media-type-btn ${mentionType === 'userId' ? 'active' : ''}`}
                  onClick={() => setMentionType('userId')}
                >
                  <span>User ID (tg://user)</span>
                </button>
              </div>

              {mentionType === 'username' ? (
                <div className="modal-input-group">
                  <label className="modal-input-label">Telegram Username</label>
                  <div className="link-input-wrapper">
                    <span className="link-protocol-prefix">@</span>
                    <input
                      type="text"
                      className="link-url-input"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="modal-input-group" style={{ marginBottom: '10px' }}>
                    <label className="modal-input-label">Telegram User ID</label>
                    <input
                      type="text"
                      className="link-url-input"
                      placeholder="e.g. 123456789"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="modal-input-group">
                    <label className="modal-input-label">Display Name</label>
                    <input
                      type="text"
                      className="link-url-input"
                      placeholder="e.g. John Doe"
                      value={mentionName}
                      onChange={(e) => setMentionName(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="link-modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="link-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="link-btn-apply"
                  disabled={mentionType === 'username' ? !username.trim() : !userId.trim()}
                >
                  <Check size={16} />
                  <span>Insert Mention</span>
                </button>
              </div>
            </form>
          )}

          {/* Date / Timestamp Tab */}
          {activeTab === 'date' && (
            <form onSubmit={handleDateSubmit} className="link-modal-body">
              <div className="modal-input-group" style={{ marginBottom: '12px' }}>
                <label className="modal-input-label">Select Date & Time</label>
                <div className="link-input-wrapper">
                  <span className="link-protocol-prefix">
                    <Calendar size={14} />
                  </span>
                  <input
                    type="datetime-local"
                    className="link-url-input"
                    value={selectedDateTime}
                    onChange={(e) => setSelectedDateTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-input-group">
                <label className="modal-input-label">Custom Label (Optional)</label>
                <input
                  type="text"
                  className="link-url-input"
                  placeholder="Leave empty for auto-formatted date"
                  value={dateLabel}
                  onChange={(e) => setDateLabel(e.target.value)}
                />
              </div>

              <div className="link-modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="link-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="link-btn-apply">
                  <Check size={16} />
                  <span>Insert Timestamp</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  </OverlayPortal>
  );
};
